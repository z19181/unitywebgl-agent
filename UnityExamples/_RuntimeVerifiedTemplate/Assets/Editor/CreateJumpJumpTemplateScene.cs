using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Editor 一键场景生成 — v0.2.6 JumpJump Template Demo
/// 
/// 菜单: Tools → PartyGame → Create JumpJump Template Demo Scene
/// 
/// 自动创建:
///   - Main Camera (with CameraFollow)
///   - Directional Light
///   - PartyGameBridge GameObject
///   - GameManager (JumpJumpGameManager)
///   - Player Prefab (capsule)
///   - PlatformSpawner + Platform Prefab (cube)
///   - SpawnPoint
///   - Canvas (world-space) + Score/Status/Power/GameOver
/// 
/// 保存: Assets/Scenes/JumpJumpTemplateDemo.unity
/// </summary>
public class CreateJumpJumpTemplateScene : EditorWindow
{
    [MenuItem("Tools/PartyGame/Create JumpJump Template Demo Scene")]
    public static void CreateScene()
    {
        // ─── 1. 创建新场景 ───
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

        Debug.Log("=== Creating JumpJump Template Demo Scene ===\n");

        // ─── 2. Main Camera ───
        var cameraGo = new GameObject("Main Camera");
        cameraGo.AddComponent<Camera>();
        cameraGo.transform.position = new Vector3(0, 5, -10);
        cameraGo.transform.LookAt(Vector3.zero);
        var camFollow = cameraGo.AddComponent<CameraFollow>();
        camFollow.offset = new Vector3(0, 5, -10);
        camFollow.smoothSpeed = 5f;
        Debug.Log("+ Main Camera (with CameraFollow)");

        // ─── 3. Directional Light ───
        var lightGo = new GameObject("Directional Light");
        var lightComp = lightGo.AddComponent<Light>();
        lightComp.type = LightType.Directional;
        lightComp.intensity = 1f;
        lightGo.transform.rotation = Quaternion.Euler(50, -30, 0);
        Debug.Log("+ Directional Light");

        // ─── 4. PartyGameBridge ───
        var bridgeGo = new GameObject("PartyGameBridge");
        bridgeGo.AddComponent<PartyGameBridge>();
        Debug.Log("+ PartyGameBridge");

        // ─── 5. GameManager ───
        var gameManagerGo = new GameObject("GameManager");
        var gm = gameManagerGo.AddComponent<JumpJumpGameManager>();
        gm.maxPlayers = 4;
        gm.scorePerPlatform = 10;
        Debug.Log("+ GameManager (JumpJumpGameManager)");

        // ─── 6. SpawnPoint ───
        var spawnGo = new GameObject("SpawnPoint");
        spawnGo.transform.position = new Vector3(0, 2, 0);
        gm.spawnPointRoot = spawnGo.transform;
        Debug.Log("+ SpawnPoint");

        // ─── 7. PlatformSpawner + Platform Prefab ───
        var platformPrefab = CreatePlatformPrefab();
        var spawnerGo = new GameObject("PlatformSpawner");
        var spawner = spawnerGo.AddComponent<PlatformSpawner>();
        spawner.platformPrefab = platformPrefab;
        spawner.poolSize = 10;
        spawner.distanceMin = 3f;
        spawner.distanceMax = 6f;
        gm.platformSpawner = spawner;
        Debug.Log("+ PlatformSpawner (with Platform Prefab)");

        // ─── 8. Player Prefab ───
        gm.playerPrefab = CreatePlayerPrefab();
        Debug.Log("+ Player Prefab");

        // ─── 9. Canvas (World Space) + UI ───
        var canvasGo = CreateCanvas();
        var uiManager = canvasGo.AddComponent<UIManager>();

        // ScoreText
        var scoreGo = new GameObject("ScoreText");
        scoreGo.transform.SetParent(canvasGo.transform);
        var scoreText = scoreGo.AddComponent<Text>();
        scoreText.text = "Score: 0";
        scoreText.fontSize = 36;
        scoreText.color = Color.yellow;
        scoreText.font = GetDefaultFont();
        scoreText.alignment = TextAnchor.MiddleCenter;
        var scoreRect = scoreGo.GetComponent<RectTransform>();
        scoreRect.anchoredPosition = new Vector2(0, 80);
        scoreRect.sizeDelta = new Vector2(400, 50);
        uiManager.scoreText = scoreText;

        // StatusText
        var statusGo = new GameObject("StatusText");
        statusGo.transform.SetParent(canvasGo.transform);
        var statusText = statusGo.AddComponent<Text>();
        statusText.text = "Waiting for players...";
        statusText.fontSize = 24;
        statusText.color = Color.white;
        statusText.font = GetDefaultFont();
        statusText.alignment = TextAnchor.MiddleCenter;
        var statusRect = statusGo.GetComponent<RectTransform>();
        statusRect.anchoredPosition = new Vector2(0, 40);
        statusRect.sizeDelta = new Vector2(400, 40);
        uiManager.statusText = statusText;

        // PowerText
        var powerGo = new GameObject("PowerText");
        powerGo.transform.SetParent(canvasGo.transform);
        var powerText = powerGo.AddComponent<Text>();
        powerText.text = "Power: 0%";
        powerText.fontSize = 20;
        powerText.color = new Color(0.5f, 1f, 0.5f);
        powerText.font = GetDefaultFont();
        powerText.alignment = TextAnchor.MiddleCenter;
        var powerRect = powerGo.GetComponent<RectTransform>();
        powerRect.anchoredPosition = new Vector2(0, 0);
        powerRect.sizeDelta = new Vector2(300, 30);
        uiManager.powerText = powerText;

        // GameOverPanel
        var gameOverGo = new GameObject("GameOverPanel");
        gameOverGo.transform.SetParent(canvasGo.transform);
        var gameOverImg = gameOverGo.AddComponent<Image>();
        gameOverImg.color = new Color(0, 0, 0, 0.7f);
        var goRect = gameOverGo.GetComponent<RectTransform>();
        goRect.anchorMin = Vector2.zero; goRect.anchorMax = Vector2.one;
        goRect.sizeDelta = Vector2.zero;
        gameOverGo.SetActive(false);
        uiManager.gameOverPanel = gameOverGo;

        // GameOverScoreText
        var goScoreGo = new GameObject("GameOverScoreText");
        goScoreGo.transform.SetParent(gameOverGo.transform);
        var goScoreText = goScoreGo.AddComponent<Text>();
        goScoreText.text = "Final Score: 0";
        goScoreText.fontSize = 48;
        goScoreText.color = Color.white;
        goScoreText.font = GetDefaultFont();
        goScoreText.alignment = TextAnchor.MiddleCenter;
        var goScoreRect = goScoreGo.GetComponent<RectTransform>();
        goScoreRect.anchoredPosition = Vector2.zero;
        goScoreRect.sizeDelta = new Vector2(500, 100);
        uiManager.gameOverScoreText = goScoreText;

        gm.uiManager = uiManager;

        // Camera follow reference
        camFollow.target = spawnGo.transform;
        gm.cameraFollow = camFollow;

        Debug.Log("+ Canvas + UI (Score/Status/Power/GameOver)");

        // ─── 10. 保存场景 ───
        string scenePath = "Assets/Scenes/JumpJumpTemplateDemo.unity";
        if (!AssetDatabase.IsValidFolder("Assets/Scenes"))
            AssetDatabase.CreateFolder("Assets", "Scenes");

        EditorSceneManager.SaveScene(scene, scenePath);
        Debug.Log($"\n=== Scene saved: {scenePath} ===");
        Debug.Log("✅ JumpJump Template Demo Scene created!\n");
        Debug.Log("Next steps:");
        Debug.Log("  1. File → Build Settings → WebGL → Switch Platform");
        Debug.Log("  2. Player Settings → WebGL Template → PartyGameTemplate");
        Debug.Log("  3. Build to Build/ folder");
        Debug.Log("  4. Start server: node server/server.js");
        Debug.Log("  5. Open http://localhost:3000/screen");
        Debug.Log("  6. Scan QR → play!");

        EditorUtility.DisplayDialog("Scene Created",
            "JumpJump Template Demo Scene created!\n\n" +
            "Saved to: Assets/Scenes/JumpJumpTemplateDemo.unity\n\n" +
            "Next: Select PartyGameTemplate in Player Settings → WebGL Template → Build!",
            "OK");
    }

    // ─── Helper: Create Player Prefab ───
    static GameObject CreatePlayerPrefab()
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        go.name = "PlayerPrefab";
        go.transform.position = Vector3.up * 2;
        var pj = go.AddComponent<PlayerJump>();
        pj.minJumpForce = 5f;
        pj.maxJumpForce = 15f;
        go.SetActive(false); // prefab mode
        return go;
    }

    // ─── Helper: Create Platform Prefab ───
    static GameObject CreatePlatformPrefab()
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = "PlatformPrefab";
        go.transform.localScale = new Vector3(2f, 0.5f, 2f);
        var mat = new Material(Shader.Find("Standard"));
        mat.color = new Color(0.2f, 0.8f, 0.2f);
        go.GetComponent<Renderer>().sharedMaterial = mat;
        go.SetActive(false);
        return go;
    }

    // ─── Helper: Create Canvas ───
    static GameObject CreateCanvas()
    {
        var go = new GameObject("Canvas");
        var canvas = go.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 100;
        var scaler = go.AddComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(800, 600);
        var raycaster = go.AddComponent<GraphicRaycaster>();
        return go;
    }

    // ─── Helper: Default Font (Unity 6: "LegacyRuntime.ttf" replaces "Arial.ttf") ───
    static Font GetDefaultFont()
    {
        return Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
    }
}
