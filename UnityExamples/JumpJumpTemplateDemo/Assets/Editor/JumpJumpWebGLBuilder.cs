// JumpJumpWebGLBuilder.cs — v0.4.2 Automated WebGL Build Pipeline
// Menu: Tools → PartyGame → Build JumpJump WebGL
// Batch: -executeMethod JumpJumpWebGLBuilder.BuildWebGL

using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using System.IO;

public class JumpJumpWebGLBuilder
{
    private const string OutputDirName = "WebGLBuild";

    // ═══════════════════════════════════════════════
    //  Interactive (Editor Menu)
    // ═══════════════════════════════════════════════
    [MenuItem("Tools/PartyGame/Build JumpJump WebGL to screen/Build")]
    public static void BuildWebGLInteractive()
    {
        BuildWebGL();
    }

    // ═══════════════════════════════════════════════
    //  Headless (Unity CLI)
    // ═══════════════════════════════════════════════
    public static void BuildWebGL()
    {
        Debug.Log("╔══════════════════════════════════════════╗");
        Debug.Log("║  JumpJump WebGL Build Pipeline           ║");
        Debug.Log("╚══════════════════════════════════════════╝\n");

        // ── 1. Create/Load Scene ──
        string scenePath = "Assets/Scenes/JumpJumpTemplateDemo.unity";
        if (!File.Exists(scenePath))
        {
            Debug.Log("→ Creating JumpJump Template Scene...");
            CreateJumpJumpTemplateScene.CreateScene();
        }
        else
        {
            Debug.Log("→ Opening existing scene: " + scenePath);
            EditorSceneManager.OpenScene(scenePath);
        }

        // Add scene to build settings
        var scenes = new EditorBuildSettingsScene[] {
            new EditorBuildSettingsScene(scenePath, true)
        };
        EditorBuildSettings.scenes = scenes;
        Debug.Log("→ Scene added to Build Settings");

        // ── 2. Switch Platform to WebGL ──
        if (EditorUserBuildSettings.activeBuildTarget != BuildTarget.WebGL)
        {
            Debug.Log("→ Switching platform to WebGL...");
            EditorUserBuildSettings.SwitchActiveBuildTarget(
                BuildTargetGroup.WebGL, BuildTarget.WebGL);
        }
        Debug.Log("→ Platform: WebGL");

        // ── 3. Select PartyGameTemplate ──
        string templatePath = "PROJECT:PartyGameTemplate";
        PlayerSettings.WebGL.template = templatePath;
        Debug.Log("→ WebGL Template: PartyGameTemplate");

        // ── 4. PlayerSettings ──
        PlayerSettings.WebGL.memorySize = 256;
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
        PlayerSettings.WebGL.dataCaching = false;
        PlayerSettings.WebGL.debugSymbolMode = WebGLDebugSymbolMode.Off;
        PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.None;
        PlayerSettings.runInBackground = false;
        PlayerSettings.productName = "JumpJump";
        PlayerSettings.companyName = "PartyGameSDK";
        Debug.Log("→ Memory: 256MB | Compression: None | Exceptions: None");

        // ── 5. Build ──
        // Application.dataPath = .../UnityExamples/JumpJumpTemplateDemo/Assets
        // Go up 1 level to ProjectRoot, then into WebGLBuild/
        string buildDir = Path.Combine(Application.dataPath, $"../{OutputDirName}");
        string fullBuildDir = Path.GetFullPath(buildDir);
        Debug.Log($"→ Output: {fullBuildDir}");

        // Ensure clean output
        if (Directory.Exists(fullBuildDir))
        {
            Directory.Delete(fullBuildDir, true);
        }
        Directory.CreateDirectory(fullBuildDir);

        // Build
        var report = BuildPipeline.BuildPlayer(
            EditorBuildSettings.scenes,
            fullBuildDir,
            BuildTarget.WebGL,
            BuildOptions.None
        );

        if (report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
        {
            EnsureTemplateData(fullBuildDir);

            Debug.Log("\n╔══════════════════════════════════════════╗");
            Debug.Log("║  ✅ BUILD SUCCEEDED                      ║");
            Debug.Log("╚══════════════════════════════════════════╝");
            Debug.Log($"   Output: {fullBuildDir}");
            Debug.Log($"   Total Size: {report.summary.totalSize / 1024 / 1024} MB");
            Debug.Log($"   Warnings: {report.summary.totalWarnings}");
            Debug.Log($"   Errors: {report.summary.totalErrors}");

            // Print output files
            Debug.Log("\n   Output files:");
            foreach (var file in Directory.GetFiles(fullBuildDir, "*", SearchOption.AllDirectories))
            {
                var info = new FileInfo(file);
                Debug.Log($"   {Path.GetRelativePath(fullBuildDir, file)} ({info.Length / 1024} KB)");
            }
        }
        else
        {
            Debug.LogError($"\n❌ BUILD FAILED: {report.summary.result}");
            Debug.LogError($"   Errors: {report.summary.totalErrors}");
            Debug.LogError($"   Warnings: {report.summary.totalWarnings}");
            EditorApplication.Exit(1);
        }
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
        Debug.Log($"→ TemplateData copied: {targetTemplateData}");
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

        foreach (var file in Directory.GetFiles(sourceDir))
        {
            File.Copy(file, Path.Combine(targetDir, Path.GetFileName(file)), true);
        }

        foreach (var directory in Directory.GetDirectories(sourceDir))
        {
            CopyDirectory(directory, Path.Combine(targetDir, Path.GetFileName(directory)));
        }
    }
}
