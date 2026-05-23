using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using System.IO;

public class SnakeWebGLBuilder
{
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

        string buildDir = Path.Combine(Application.dataPath, "../../../screen/Build");
        string fullBuildDir = Path.GetFullPath(buildDir);
        if (Directory.Exists(fullBuildDir)) Directory.Delete(fullBuildDir, true);
        Directory.CreateDirectory(fullBuildDir);

        var report = BuildPipeline.BuildPlayer(EditorBuildSettings.scenes, fullBuildDir, BuildTarget.WebGL, BuildOptions.Development);

        if (report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
            Debug.Log("✅ SNAKE BUILD SUCCEEDED: " + fullBuildDir);
        else
        {
            Debug.LogError("❌ SNAKE BUILD FAILED: " + report.summary.result);
            EditorApplication.Exit(1);
        }
    }
}
