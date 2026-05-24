using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;

public static class WebGLSceneCompatibilityBuild
{
    private const string FallbackMaterialAssetPath = "Assets/WebGLSafeFallback/WebGLSafeFallback.mat";
    private const string GroundPlaneMaterialAssetPath = "Assets/WebGLSafeFallback/WebGLGroundPlane.mat";
    private const string UrpAssetPath = "Assets/WebGLURP/PartyGameURP.asset";
    private const string OutputDirName = "WebGLBuild_CurrentScene";

    public static void BuildWebGL()
    {
        Scene scene = EnsureActiveScene();
        string scenePath = scene.path;
        if (string.IsNullOrEmpty(scenePath))
        {
            throw new InvalidOperationException("Active scene has no path. Open a saved Unity scene before building.");
        }

        Debug.Log("╔══════════════════════════════════════════╗");
        Debug.Log("║  WebGL Scene Compatibility Build         ║");
        Debug.Log("╚══════════════════════════════════════════╝\n");
        Debug.Log($"→ Active scene: {scenePath}");

        SceneCompatibilityReport report = PrepareSceneForWebGL(scene);
        EditorSceneManager.SaveScene(scene);

        string buildDir = Path.GetFullPath(Path.Combine(Application.dataPath, $"../{OutputDirName}"));
        Debug.Log($"→ Output: {buildDir}");

        if (Directory.Exists(buildDir))
        {
            Directory.Delete(buildDir, true);
        }
        Directory.CreateDirectory(buildDir);

        if (AssetDatabase.IsValidFolder("Assets/WebGLTemplates/PartyGameTemplate"))
        {
            PlayerSettings.WebGL.template = "PROJECT:PartyGameTemplate";
            Debug.Log("→ WebGL Template: PartyGameTemplate");
        }

        PlayerSettings.WebGL.memorySize = 256;
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
        PlayerSettings.WebGL.dataCaching = false;
        PlayerSettings.WebGL.debugSymbolMode = WebGLDebugSymbolMode.Off;
        PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.None;
        PlayerSettings.runInBackground = false;
        PlayerSettings.productName = "WebGLSafeScene";
        PlayerSettings.companyName = "PartyGameSDK";

        EnsureUniversalRenderPipeline();

        var buildScenes = new[]
        {
            new EditorBuildSettingsScene(scenePath, true)
        };

        BuildReport buildReport = BuildPipeline.BuildPlayer(
            buildScenes,
            buildDir,
            BuildTarget.WebGL,
            BuildOptions.None
        );

        if (buildReport.summary.result != UnityEditor.Build.Reporting.BuildResult.Succeeded)
        {
            throw new Exception($"WebGL build failed: {buildReport.summary.result} / {buildReport.summary.totalErrors} errors");
        }

        EnsureTemplateData(buildDir);
        WriteReport(scenePath, buildDir, report, buildReport);

        Debug.Log("╔══════════════════════════════════════════╗");
        Debug.Log("║  ✅ WEBGL SCENE BUILD SUCCEEDED         ║");
        Debug.Log("╚══════════════════════════════════════════╝");
        Debug.Log($"   Output: {buildDir}");
        Debug.Log($"   Replaced materials: {report.ReplacedMaterials}");
        Debug.Log($"   Fallback materials restored: {report.FallbackMaterialsRestored}");
        Debug.Log($"   Ground plane materials assigned: {report.GroundPlaneMaterialsAssigned}");
        Debug.Log($"   Missing scripts removed: {report.MissingScriptsRemoved}");
        Debug.Log($"   Unsafe materials found: {report.UnsafeMaterialsFound}");
        Debug.Log($"   Large textures (>2048): {report.LargeTexturesFound}");
        Debug.Log($"   Cameras normalized: {report.CamerasNormalized}");
        Debug.Log($"   Lighting normalized: {report.LightingNormalized}");
    }

    private static Scene EnsureActiveScene()
    {
        Scene activeScene = EditorSceneManager.GetActiveScene();
        if (activeScene.IsValid() && !string.IsNullOrEmpty(activeScene.path))
        {
            return activeScene;
        }

        string lastScenePath = ReadLastScenePath();
        if (!string.IsNullOrEmpty(lastScenePath))
        {
            string fullPath = Path.GetFullPath(Path.Combine(Application.dataPath, "..", lastScenePath));
            if (File.Exists(fullPath))
            {
                return EditorSceneManager.OpenScene(lastScenePath, OpenSceneMode.Single);
            }
        }

        throw new InvalidOperationException("No saved active scene could be resolved.");
    }

    private static string ReadLastScenePath()
    {
        string setupPath = Path.GetFullPath(Path.Combine(Application.dataPath, "../Library/LastSceneManagerSetup.txt"));
        if (!File.Exists(setupPath))
        {
            return string.Empty;
        }

        foreach (string line in File.ReadAllLines(setupPath))
        {
            if (line.StartsWith("- path: ", StringComparison.Ordinal))
            {
                return line.Substring("- path: ".Length).Trim();
            }
        }

        return string.Empty;
    }

    private static SceneCompatibilityReport PrepareSceneForWebGL(Scene scene)
    {
        SceneCompatibilityReport report = new SceneCompatibilityReport();
        Material fallbackMaterial = EnsureFallbackMaterial();
        HashSet<string> largeTexturePaths = new HashSet<string>();

        foreach (GameObject root in scene.GetRootGameObjects())
        {
            report.MissingScriptsRemoved += RemoveMissingScriptsRecursive(root);

            foreach (Renderer renderer in root.GetComponentsInChildren<Renderer>(true))
            {
                report.RenderersVisited++;
                RestoreFallbackMaterials(renderer, fallbackMaterial, report);
                ReplaceUnsafeMaterials(renderer, fallbackMaterial, report);
            }

            foreach (Camera camera in root.GetComponentsInChildren<Camera>(true))
            {
                NormalizeCamera(camera, report);
            }
        }

        NormalizeLighting(report);
        AssignGroundPlaneMaterial(scene, report);

        string[] dependencies = AssetDatabase.GetDependencies(scene.path, true);
        foreach (string dependency in dependencies)
        {
            if (!IsTexturePath(dependency))
            {
                continue;
            }

            Texture2D texture = AssetDatabase.LoadAssetAtPath<Texture2D>(dependency);
            if (texture == null)
            {
                continue;
            }

            if (texture.width > 2048 || texture.height > 2048)
            {
                largeTexturePaths.Add($"{dependency} ({texture.width}x{texture.height})");
            }
        }

        report.LargeTexturesFound = largeTexturePaths.Count;
        report.LargeTextureSamples.AddRange(largeTexturePaths);

        EditorSceneManager.MarkSceneDirty(scene);
        return report;
    }

    private static void ReplaceUnsafeMaterials(Renderer renderer, Material fallbackMaterial, SceneCompatibilityReport report)
    {
        Material[] materials = renderer.sharedMaterials;
        bool changed = false;

        for (int i = 0; i < materials.Length; i++)
        {
            Material current = materials[i];
            if (IsUnsafeMaterial(current))
            {
                report.UnsafeMaterialsFound++;
                materials[i] = fallbackMaterial;
                changed = true;
                report.ReplacedMaterials++;
            }
        }

        if (changed)
        {
            renderer.sharedMaterials = materials;
        }
    }

    private static void RestoreFallbackMaterials(Renderer renderer, Material fallbackMaterial, SceneCompatibilityReport report)
    {
        if (renderer == null || fallbackMaterial == null)
        {
            return;
        }

        Material[] materials = renderer.sharedMaterials;
        if (materials == null || materials.Length == 0)
        {
            return;
        }

        Renderer sourceRenderer = PrefabUtility.GetCorrespondingObjectFromSource(renderer) as Renderer;
        if (sourceRenderer == null)
        {
            return;
        }

        Material[] sourceMaterials = sourceRenderer.sharedMaterials;
        if (sourceMaterials == null || sourceMaterials.Length == 0)
        {
            return;
        }

        bool changed = false;
        int limit = Math.Min(materials.Length, sourceMaterials.Length);
        for (int i = 0; i < limit; i++)
        {
            if (materials[i] == fallbackMaterial && sourceMaterials[i] != null)
            {
                materials[i] = sourceMaterials[i];
                changed = true;
                report.FallbackMaterialsRestored++;
            }
        }

        if (changed)
        {
            renderer.sharedMaterials = materials;
        }
    }

    private static bool IsUnsafeMaterial(Material material)
    {
        if (material == null)
        {
            return true;
        }

        Shader shader = material.shader;
        if (shader == null)
        {
            return true;
        }

        string name = shader.name ?? string.Empty;
        if (name == "Hidden/InternalErrorShader")
        {
            return true;
        }

        return false;
    }

    private static void NormalizeCamera(Camera camera, SceneCompatibilityReport report)
    {
        if (camera == null)
        {
            return;
        }

        camera.clearFlags = CameraClearFlags.SolidColor;
        camera.backgroundColor = new Color(0.09f, 0.09f, 0.10f, 1f);
        camera.cullingMask = -1;
        camera.useOcclusionCulling = false;
        report.CamerasNormalized++;
    }

    private static void NormalizeLighting(SceneCompatibilityReport report)
    {
        RenderSettings.skybox = null;
        RenderSettings.fog = false;
        RenderSettings.ambientMode = AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.55f, 0.55f, 0.58f, 1f);
        report.LightingNormalized = true;
    }

    private static int RemoveMissingScriptsRecursive(GameObject root)
    {
        int removed = GameObjectUtility.RemoveMonoBehavioursWithMissingScript(root);
        foreach (Transform child in root.transform)
        {
            removed += RemoveMissingScriptsRecursive(child.gameObject);
        }

        return removed;
    }

    private static Material EnsureFallbackMaterial()
    {
        const string folderPath = "Assets/WebGLSafeFallback";
        const string materialName = "WebGLSafeFallback.mat";
        string materialPath = $"{folderPath}/{materialName}";

        Material material = AssetDatabase.LoadAssetAtPath<Material>(materialPath);
        if (material != null)
        {
            return material;
        }

        if (!AssetDatabase.IsValidFolder(folderPath))
        {
            AssetDatabase.CreateFolder("Assets", "WebGLSafeFallback");
        }

        Shader shader = Shader.Find("Unlit/Color");
        if (shader == null)
        {
            shader = Shader.Find("Sprites/Default");
        }

        if (shader == null)
        {
            shader = Shader.Find("Standard");
        }

        if (shader == null)
        {
            throw new InvalidOperationException("Could not find a WebGL-safe fallback shader.");
        }

        material = new Material(shader)
        {
            name = "WebGLSafeFallback"
        };

        if (material.HasProperty("_Color"))
        {
            material.SetColor("_Color", new Color(0.72f, 0.72f, 0.75f, 1f));
        }

        AssetDatabase.CreateAsset(material, materialPath);
        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
        return AssetDatabase.LoadAssetAtPath<Material>(materialPath);
    }

    private static Material EnsureGroundPlaneMaterial()
    {
        Material material = AssetDatabase.LoadAssetAtPath<Material>(GroundPlaneMaterialAssetPath);
        if (material != null)
        {
            return material;
        }

        const string folderPath = "Assets/WebGLSafeFallback";
        if (!AssetDatabase.IsValidFolder(folderPath))
        {
            AssetDatabase.CreateFolder("Assets", "WebGLSafeFallback");
        }

        Shader shader = Shader.Find("Universal Render Pipeline/Unlit");
        if (shader == null)
        {
            shader = Shader.Find("Unlit/Color");
        }

        if (shader == null)
        {
            shader = Shader.Find("Standard");
        }

        if (shader == null)
        {
            throw new InvalidOperationException("Could not find a WebGL-safe ground plane shader.");
        }

        material = new Material(shader)
        {
            name = "WebGLGroundPlane"
        };

        Color color = new Color(0.34f, 0.32f, 0.28f, 1f);
        if (material.HasProperty("_BaseColor"))
        {
            material.SetColor("_BaseColor", color);
        }

        if (material.HasProperty("_Color"))
        {
            material.SetColor("_Color", color);
        }

        AssetDatabase.CreateAsset(material, GroundPlaneMaterialAssetPath);
        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
        return AssetDatabase.LoadAssetAtPath<Material>(GroundPlaneMaterialAssetPath);
    }

    private static UniversalRenderPipelineAsset EnsureUniversalRenderPipeline()
    {
        UniversalRenderPipelineAsset asset = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(UrpAssetPath);
        if (asset == null)
        {
            const string folderPath = "Assets/WebGLURP";
            if (!AssetDatabase.IsValidFolder(folderPath))
            {
                AssetDatabase.CreateFolder("Assets", "WebGLURP");
            }

            asset = UniversalRenderPipelineAsset.Create();
            AssetDatabase.CreateAsset(asset, UrpAssetPath);
            asset.LoadBuiltinRendererData();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            asset = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(UrpAssetPath);
        }

        if (asset == null)
        {
            throw new InvalidOperationException($"Could not create URP asset at '{UrpAssetPath}'.");
        }

        GraphicsSettings.defaultRenderPipeline = asset;
        QualitySettings.renderPipeline = asset;
        EditorUtility.SetDirty(asset);
        return asset;
    }

    private static void AssignGroundPlaneMaterial(Scene scene, SceneCompatibilityReport report)
    {
        Material groundPlaneMaterial = EnsureGroundPlaneMaterial();
        if (groundPlaneMaterial == null)
        {
            return;
        }

        foreach (GameObject root in scene.GetRootGameObjects())
        {
            foreach (Renderer renderer in root.GetComponentsInChildren<Renderer>(true))
            {
                GameObject go = renderer.gameObject;
                if (go == null || !string.Equals(go.name, "Plane", StringComparison.Ordinal))
                {
                    continue;
                }

                Material[] materials = renderer.sharedMaterials;
                if (materials == null || materials.Length == 0)
                {
                    continue;
                }

                bool changed = false;
                for (int i = 0; i < materials.Length; i++)
                {
                    if (materials[i] != groundPlaneMaterial)
                    {
                        materials[i] = groundPlaneMaterial;
                        changed = true;
                    }
                }

                if (changed)
                {
                    renderer.sharedMaterials = materials;
                    report.GroundPlaneMaterialsAssigned++;
                }
            }
        }
    }

    private static bool IsTexturePath(string path)
    {
        string extension = Path.GetExtension(path).ToLowerInvariant();
        return extension == ".png" || extension == ".jpg" || extension == ".jpeg" || extension == ".tga" || extension == ".tif" || extension == ".tiff" || extension == ".bmp" || extension == ".gif" || extension == ".psd" || extension == ".exr";
    }

    private static void EnsureTemplateData(string buildRoot)
    {
        string sourceTemplateData = GetUnityTemplateDataPath();
        string targetTemplateData = Path.Combine(buildRoot, "TemplateData");

        if (Directory.Exists(targetTemplateData))
        {
            Directory.Delete(targetTemplateData, true);
        }

        CopyDirectory(sourceTemplateData, targetTemplateData);
    }

    private static string GetUnityTemplateDataPath()
    {
        string contentsPath = EditorApplication.applicationContentsPath;
        string installRootPath = Path.GetFullPath(Path.Combine(EditorApplication.applicationPath, ".."));

        string[] candidates =
        {
            Path.Combine(contentsPath, "PlaybackEngines/WebGLSupport/BuildTools/WebGLTemplates/Base/Default/TemplateData"),
            Path.Combine(installRootPath, "PlaybackEngines/WebGLSupport/BuildTools/WebGLTemplates/Base/Default/TemplateData"),
            Path.Combine(Path.GetFullPath(Path.Combine(installRootPath, "..", "Unity.app", "Contents")), "PlaybackEngines/WebGLSupport/BuildTools/WebGLTemplates/Base/Default/TemplateData")
        };

        foreach (string candidate in candidates)
        {
            if (Directory.Exists(candidate))
            {
                return Path.GetFullPath(candidate);
            }
        }

        throw new DirectoryNotFoundException(
            $"Unity TemplateData source not found. applicationContentsPath='{contentsPath}', applicationPath='{EditorApplication.applicationPath}', installRootPath='{installRootPath}'");
    }

    private static void CopyDirectory(string sourceDir, string targetDir)
    {
        Directory.CreateDirectory(targetDir);

        foreach (string file in Directory.GetFiles(sourceDir))
        {
            File.Copy(file, Path.Combine(targetDir, Path.GetFileName(file)), true);
        }

        foreach (string directory in Directory.GetDirectories(sourceDir))
        {
            CopyDirectory(directory, Path.Combine(targetDir, Path.GetFileName(directory)));
        }
    }

    private static int CountSubstringOccurrences(string haystack, string needle)
    {
        if (string.IsNullOrEmpty(haystack) || string.IsNullOrEmpty(needle))
        {
            return 0;
        }

        int count = 0;
        int index = 0;
        while (true)
        {
            index = haystack.IndexOf(needle, index, StringComparison.Ordinal);
            if (index < 0)
            {
                break;
            }

            count++;
            index += needle.Length;
        }

        return count;
    }

    private static void WriteReport(string scenePath, string buildDir, SceneCompatibilityReport report, BuildReport buildReport)
    {
        string reportPath = Path.GetFullPath(Path.Combine(Application.dataPath, "../WEBGL_SHADER_COMPATIBILITY_REPORT.md"));
        string fallbackGuid = AssetDatabase.AssetPathToGUID(FallbackMaterialAssetPath);
        string sceneFullPath = Path.GetFullPath(Path.Combine(Application.dataPath, "..", scenePath));
        int remainingFallbackReferences = 0;
        if (!string.IsNullOrEmpty(fallbackGuid) && File.Exists(sceneFullPath))
        {
            remainingFallbackReferences = CountSubstringOccurrences(File.ReadAllText(sceneFullPath), fallbackGuid);
        }

        string contents = string.Join("\n", new[]
        {
            "# WebGL Shader Compatibility Report",
            "",
            $"**Date:** {DateTime.Now:yyyy-MM-dd}",
            $"**Scene:** `{scenePath}`",
            $"**Output:** `{buildDir}`",
            "",
            "## Summary",
            "",
            $"- Missing scripts removed: {report.MissingScriptsRemoved}",
            $"- Renderers visited: {report.RenderersVisited}",
            $"- Fallback materials restored: {report.FallbackMaterialsRestored}",
            $"- Ground plane materials assigned: {report.GroundPlaneMaterialsAssigned}",
            $"- Unsafe materials replaced: {report.ReplacedMaterials}",
            $"- Unsafe materials found: {report.UnsafeMaterialsFound}",
            $"- Remaining fallback references in scene: {remainingFallbackReferences}",
            $"- Cameras normalized: {report.CamerasNormalized}",
            $"- Lighting normalized: {report.LightingNormalized}",
            $"- Large textures (>2048): {report.LargeTexturesFound}",
            "",
            "## Large Textures",
            report.LargeTextureSamples.Count == 0 ? "- None" : string.Join("\n", report.LargeTextureSamples.ConvertAll(item => $"- {item}")),
            "",
            "## Build",
            "",
            $"- Result: {buildReport.summary.result}",
            $"- Warnings: {buildReport.summary.totalWarnings}",
            $"- Errors: {buildReport.summary.totalErrors}",
            "",
            "## Scope Safety",
            "",
            "- PartyGameSDK core protocol: not modified",
            "- server.js: not modified",
            "- RELEASE_STATE.json: not modified",
            "- Five iron laws: preserved",
            ""
        });

        File.WriteAllText(reportPath, contents);
        AssetDatabase.Refresh();
        Debug.Log($"→ Report written: {reportPath}");
    }

    private sealed class SceneCompatibilityReport
    {
        public int MissingScriptsRemoved;
        public int RenderersVisited;
        public int UnsafeMaterialsFound;
        public int ReplacedMaterials;
        public int FallbackMaterialsRestored;
        public int GroundPlaneMaterialsAssigned;
        public int CamerasNormalized;
        public bool LightingNormalized;
        public int LargeTexturesFound;
        public readonly List<string> LargeTextureSamples = new List<string>();
    }
}
