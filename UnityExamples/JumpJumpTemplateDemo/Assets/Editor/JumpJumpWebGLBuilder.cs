// JumpJumpWebGLBuilder.cs — v0.4.2 Automated WebGL Build Pipeline
// Menu: Tools → PartyGame → Build JumpJump WebGL
// Batch: -executeMethod JumpJumpWebGLBuilder.BuildWebGL

using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using System.IO;

public class JumpJumpWebGLBuilder
{
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
        // Go up 3 levels to ProjectRoot, then into screen/Build/
        string buildDir = Path.Combine(Application.dataPath, "../../../screen/Build");
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
            BuildOptions.Development  // v0.4.2: Development mode avoids Emscripten JSON parse issues
        );

        if (report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
        {
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
}
