using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using System.IO;

public class BreakoutWebGLBuilder
{
    private const string OutputDirName = "Build_Breakout";

    [MenuItem("Tools/PartyGame/Build Breakout WebGL")]
    public static void BuildWebGLInteractive() { BuildWebGL(); }

    public static void BuildWebGL()
    {
        Debug.Log("═ Breakout WebGL Build Pipeline ═\n");
        string scenePath = "Assets/Scenes/BreakoutTemplateDemo.unity";
        if (!File.Exists(scenePath))
        {
            Debug.Log("→ Creating Breakout Scene...");
            CreateBreakoutScene.CreateScene();
        }
        else { EditorSceneManager.OpenScene(scenePath); }

        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(scenePath, true) };
        if (EditorUserBuildSettings.activeBuildTarget != BuildTarget.WebGL)
            EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.WebGL, BuildTarget.WebGL);

        PlayerSettings.WebGL.template = "PROJECT:PartyGameTemplate";
        PlayerSettings.WebGL.memorySize = 256;
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
        PlayerSettings.WebGL.debugSymbolMode = WebGLDebugSymbolMode.Off;
        PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.None;
        PlayerSettings.productName = "Breakout";
        PlayerSettings.companyName = "PartyGameSDK";

        string buildDir = Path.GetFullPath(Path.Combine(Application.dataPath, $"../../../screen/{OutputDirName}"));
        if (Directory.Exists(buildDir))
        {
            Directory.Delete(buildDir, true);
        }
        Directory.CreateDirectory(buildDir);

        var report = BuildPipeline.BuildPlayer(EditorBuildSettings.scenes, buildDir, BuildTarget.WebGL, BuildOptions.None);
        if (report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
        {
            FlattenBuiltFiles(buildDir);
            Debug.Log("✅ BREAKOUT BUILD SUCCEEDED: " + buildDir);
        }
        else
        {
            Debug.LogError("❌ BREAKOUT BUILD FAILED");
            EditorApplication.Exit(1);
        }
    }

    private static void FlattenBuiltFiles(string buildRoot)
    {
        string nestedBuildDir = Path.Combine(buildRoot, "Build");
        if (!Directory.Exists(nestedBuildDir))
        {
            Debug.Log("→ No nested Build/ directory found; skipping flatten step");
            return;
        }

        Debug.Log("→ Flattening Build artifacts to output root...");
        foreach (var file in Directory.GetFiles(nestedBuildDir, "*", SearchOption.AllDirectories))
        {
            var relativePath = Path.GetRelativePath(nestedBuildDir, file);
            var targetPath = Path.Combine(buildRoot, relativePath);
            var targetDir = Path.GetDirectoryName(targetPath);
            if (!string.IsNullOrEmpty(targetDir))
            {
                Directory.CreateDirectory(targetDir);
            }

            File.Copy(file, targetPath, true);
        }

        Directory.Delete(nestedBuildDir, true);
        Debug.Log("→ Flatten complete");
    }
}
