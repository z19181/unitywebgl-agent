using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using System.IO;

public class Game2048WebGLBuilder
{
    private const string OutputDirName = "Build_2048";

    [MenuItem("Tools/PartyGame/Build 2048 WebGL to screen/Build")]
    public static void BuildWebGLInteractive()
    {
        BuildWebGL();
    }

    public static void BuildWebGL()
    {
        Debug.Log("╔══════════════════════════════════════════╗");
        Debug.Log("║  2048 WebGL Build Pipeline               ║");
        Debug.Log("╚══════════════════════════════════════════╝\n");

        string scenePath = "Assets/Scenes/2048TemplateDemo.unity";
        if (!File.Exists(scenePath))
        {
            Debug.Log("→ Creating 2048 Template Scene...");
            Create2048Scene.CreateScene();
        }
        else
        {
            Debug.Log("→ Opening existing scene: " + scenePath);
            EditorSceneManager.OpenScene(scenePath);
        }

        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(scenePath, true) };

        if (EditorUserBuildSettings.activeBuildTarget != BuildTarget.WebGL)
        {
            Debug.Log("→ Switching platform to WebGL...");
            EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.WebGL, BuildTarget.WebGL);
        }

        PlayerSettings.WebGL.template = "PROJECT:PartyGameTemplate";
        PlayerSettings.WebGL.memorySize = 256;
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
        PlayerSettings.WebGL.dataCaching = false;
        PlayerSettings.WebGL.debugSymbolMode = WebGLDebugSymbolMode.Off;
        PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.None;
        PlayerSettings.runInBackground = false;
        PlayerSettings.productName = "2048";
        PlayerSettings.companyName = "PartyGameSDK";

        string buildDir = Path.Combine(Application.dataPath, $"../../../screen/{OutputDirName}");
        string fullBuildDir = Path.GetFullPath(buildDir);
        if (Directory.Exists(fullBuildDir))
        {
            Directory.Delete(fullBuildDir, true);
        }
        Directory.CreateDirectory(fullBuildDir);

        var report = BuildPipeline.BuildPlayer(
            EditorBuildSettings.scenes,
            fullBuildDir,
            BuildTarget.WebGL,
            BuildOptions.None
        );

        if (report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
        {
            FlattenBuiltFiles(fullBuildDir);

            Debug.Log("\n╔══════════════════════════════════════════╗");
            Debug.Log("║  ✅ 2048 BUILD SUCCEEDED                 ║");
            Debug.Log("╚══════════════════════════════════════════╝");
            Debug.Log($"   Output: {fullBuildDir}");
            Debug.Log($"   Total Size: {report.summary.totalSize / 1024 / 1024} MB");
            Debug.Log($"   Warnings: {report.summary.totalWarnings}");
            Debug.Log($"   Errors: {report.summary.totalErrors}");

            Debug.Log("\n   Output files:");
            foreach (var file in Directory.GetFiles(fullBuildDir, "*", SearchOption.AllDirectories))
            {
                var info = new FileInfo(file);
                Debug.Log($"   {Path.GetRelativePath(fullBuildDir, file)} ({info.Length / 1024} KB)");
            }
        }
        else
        {
            Debug.LogError($"\n❌ 2048 BUILD FAILED: {report.summary.result}");
            Debug.LogError($"   Errors: {report.summary.totalErrors}");
            Debug.LogError($"   Warnings: {report.summary.totalWarnings}");
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
