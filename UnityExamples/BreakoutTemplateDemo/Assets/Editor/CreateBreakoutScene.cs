using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;

public class CreateBreakoutScene
{
    [MenuItem("Tools/PartyGame/Create Breakout Scene")]
    public static void CreateScene()
    {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        Debug.Log("=== Creating Breakout Demo Scene ===");

        var camGo = new GameObject("Main Camera");
        var cam = camGo.AddComponent<Camera>();
        cam.orthographic = true;
        cam.orthographicSize = 5;
        cam.backgroundColor = Color.black;
        cam.transform.position = new Vector3(0, 0, -10);

        var bridgeGo = new GameObject("PartyGameBridge");
        bridgeGo.AddComponent<PartyGameBridge>();
        bridgeGo.AddComponent<BreakoutGameManager>();
        bridgeGo.AddComponent<PaddleController>();

        string savePath = "Assets/Scenes/BreakoutTemplateDemo.unity";
        System.IO.Directory.CreateDirectory("Assets/Scenes");
        EditorSceneManager.SaveScene(scene, savePath);
        Debug.Log($"Scene saved to {savePath} — DONE");
    }
}
