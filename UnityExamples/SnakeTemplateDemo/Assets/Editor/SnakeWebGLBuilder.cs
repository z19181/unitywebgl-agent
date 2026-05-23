using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using System.IO;

public class SnakeWebGLBuilder
{
    private const string OutputDirName = "Build_Snake";

    [MenuItem("Tools/PartyGame/Build Snake WebGL to screen/Build")]
    public static void BuildWebGLInteractive() { BuildWebGL(); }

    public static void BuildWebGL()
    {
        Debug.Log("╔══════════════════════════════════════════╗");
        Debug.Log("║  Snake WebGL Build Pipeline              ║");
        Debug.Log("╚══════════════════════════════════════════╝\n");

        string scenePath = "Assets/Scenes/SnakeTemplateDemo.unity";
        if (!File.Exists(scenePath))
        {
            Debug.Log("→ Creating Snake Template Scene...");
            CreateSnakeScene.CreateScene();
        }
        else
        {
            Debug.Log("→ Opening existing scene: " + scenePath);
            EditorSceneManager.OpenScene(scenePath);
        }

        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(scenePath, true) };

        if (EditorUserBuildSettings.activeBuildTarget != BuildTarget.WebGL)
            EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.WebGL, BuildTarget.WebGL);

        PlayerSettings.WebGL.template = "PROJECT:PartyGameTemplate";
        PlayerSettings.WebGL.memorySize = 256;
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
        PlayerSettings.WebGL.debugSymbolMode = WebGLDebugSymbolMode.Off;
        PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.None;
        PlayerSettings.productName = "Snake";
        PlayerSettings.companyName = "PartyGameSDK";

        string buildDir = Path.Combine(Application.dataPath, $"../../../screen/{OutputDirName}");
        string fullBuildDir = Path.GetFullPath(buildDir);
        if (Directory.Exists(fullBuildDir)) Directory.Delete(fullBuildDir, true);
        Directory.CreateDirectory(fullBuildDir);

        var report = BuildPipeline.BuildPlayer(EditorBuildSettings.scenes, fullBuildDir, BuildTarget.WebGL, BuildOptions.None);

        if (report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
        {
            FlattenBuiltFiles(fullBuildDir);
            Debug.Log("✅ SNAKE BUILD SUCCEEDED: " + fullBuildDir);
        }
        else
        {
            Debug.LogError("❌ SNAKE BUILD FAILED: " + report.summary.result);
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
