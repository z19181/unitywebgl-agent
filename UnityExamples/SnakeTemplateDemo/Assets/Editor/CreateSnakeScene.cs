using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Editor 一键场景生成 — Snake Template Demo v0.2.7
/// 菜单: Tools → PartyGame → Create Snake Template Scene
/// </summary>
public class CreateSnakeScene : EditorWindow
{
    [MenuItem("Tools/PartyGame/Create Snake Template Scene")]
    public static void CreateScene()
    {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        Debug.Log("=== Creating Snake Template Demo Scene ===\n");

        // 1. Main Camera (orthographic, top-down)
        var camGo = new GameObject("Main Camera");
        var cam = camGo.AddComponent<Camera>();
        cam.orthographic = true;
        cam.orthographicSize = 7;
        camGo.transform.position = new Vector3(0, 5, -10);
        camGo.transform.LookAt(Vector3.zero);
        cam.backgroundColor = new Color(0.1f, 0.1f, 0.15f);
        Debug.Log("+ Main Camera (orthographic top-down)");

        // 2. Directional Light
        var lightGo = new GameObject("Directional Light");
        var lightComp = lightGo.AddComponent<Light>();
        lightComp.type = LightType.Directional;
        lightComp.intensity = 0.8f;
        lightGo.transform.rotation = Quaternion.Euler(90, 0, 0);
        Debug.Log("+ Directional Light");

        // 3. PartyGameBridge (★ 名称精确)
        var bridgeGo = new GameObject("PartyGameBridge");
        bridgeGo.AddComponent<PartyGameBridge>();
        Debug.Log("+ PartyGameBridge");

        // 4. GameManager
        var gmGo = new GameObject("GameManager");
        var gm = gmGo.AddComponent<SnakeGameManager>();
        gm.gridWidth = 20;
        gm.gridHeight = 20;
        gm.cellSize = 0.5f;
        gm.tickInterval = 0.25f;
        Debug.Log("+ GameManager (SnakeGameManager)");

        // 5. Canvas + UI
        var canvasGo = new GameObject("Canvas");
        var canvas = canvasGo.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 100;
        canvasGo.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        canvasGo.GetComponent<CanvasScaler>().referenceResolution = new Vector2(800, 600);
        canvasGo.AddComponent<GraphicRaycaster>();

        var ui = canvasGo.AddComponent<SnakeUIManager>();

        // ScoreText
        var scoreGo = new GameObject("ScoreText");
        scoreGo.transform.SetParent(canvasGo.transform);
        var scoreText = scoreGo.AddComponent<Text>();
        scoreText.text = "Score: 0";
        scoreText.fontSize = 36; scoreText.color = Color.yellow;
        scoreText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        scoreText.alignment = TextAnchor.MiddleCenter;
        scoreGo.GetComponent<RectTransform>().anchoredPosition = new Vector2(0, 80);
        scoreGo.GetComponent<RectTransform>().sizeDelta = new Vector2(400, 50);
        ui.scoreText = scoreText;

        // StatusText
        var statusGo = new GameObject("StatusText");
        statusGo.transform.SetParent(canvasGo.transform);
        var statusText = statusGo.AddComponent<Text>();
        statusText.text = "Waiting for players...";
        statusText.fontSize = 24; statusText.color = Color.white;
        statusText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        statusText.alignment = TextAnchor.MiddleCenter;
        statusGo.GetComponent<RectTransform>().anchoredPosition = new Vector2(0, 40);
        statusGo.GetComponent<RectTransform>().sizeDelta = new Vector2(400, 40);
        ui.statusText = statusText;

        // GameOverPanel
        var goPanel = new GameObject("GameOverPanel");
        goPanel.transform.SetParent(canvasGo.transform);
        var goImg = goPanel.AddComponent<Image>();
        goImg.color = new Color(0, 0, 0, 0.7f);
        var goRect = goPanel.GetComponent<RectTransform>();
        goRect.anchorMin = Vector2.zero; goRect.anchorMax = Vector2.one;
        goRect.sizeDelta = Vector2.zero;
        goPanel.SetActive(false);
        ui.gameOverPanel = goPanel;

        var goScoreGo = new GameObject("GameOverScoreText");
        goScoreGo.transform.SetParent(goPanel.transform);
        var goScoreText = goScoreGo.AddComponent<Text>();
        goScoreText.text = "Final Score: 0";
        goScoreText.fontSize = 48; goScoreText.color = Color.white;
        goScoreText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        goScoreText.alignment = TextAnchor.MiddleCenter;
        goScoreGo.GetComponent<RectTransform>().anchoredPosition = Vector2.zero;
        goScoreGo.GetComponent<RectTransform>().sizeDelta = new Vector2(500, 100);
        ui.gameOverScoreText = goScoreText;

        gm.uiManager = ui;
        Debug.Log("+ Canvas + UI (Score/Status/GameOver)");

        // 6. Save scene
        string scenePath = "Assets/Scenes/SnakeTemplateDemo.unity";
        if (!AssetDatabase.IsValidFolder("Assets/Scenes"))
            AssetDatabase.CreateFolder("Assets", "Scenes");
        EditorSceneManager.SaveScene(scene, scenePath);

        Debug.Log($"\n=== Scene saved: {scenePath} ===");
        Debug.Log("✅ Snake Template Demo Scene created!\n");
        Debug.Log("Next: Build → Start server → Scan QR → Use direction buttons!");

        EditorUtility.DisplayDialog("Snake Scene Created",
            "Snake Template Demo Scene created!\n\n" +
            "Controller sends input.direction (up/down/left/right)\n" +
            "Unity handles snake movement + food + collision",
            "OK");
    }
}
