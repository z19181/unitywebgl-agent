using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;

public class Create2048Scene : EditorWindow
{
    [MenuItem("Tools/PartyGame/Create 2048 Template Scene")]
    public static void CreateScene()
    {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

        var cameraGo = new GameObject("Main Camera");
        var camera = cameraGo.AddComponent<Camera>();
        camera.orthographic = true;
        camera.orthographicSize = 6.5f;
        camera.backgroundColor = new Color(0.12f, 0.13f, 0.16f);
        cameraGo.transform.position = new Vector3(0, 0, -10f);

        var lightGo = new GameObject("Directional Light");
        var light = lightGo.AddComponent<Light>();
        light.type = LightType.Directional;
        light.intensity = 0.7f;
        lightGo.transform.rotation = Quaternion.Euler(50f, -30f, 0f);

        var bridgeGo = new GameObject("PartyGameBridge");
        bridgeGo.AddComponent<PartyGameBridge>();

        var gmGo = new GameObject("GameManager");
        var gm = gmGo.AddComponent<Game2048Manager>();

        var canvasGo = new GameObject("Canvas");
        var canvas = canvasGo.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 100;
        canvasGo.AddComponent<CanvasScaler>().referenceResolution = new Vector2(960, 640);
        canvasGo.GetComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        canvasGo.AddComponent<GraphicRaycaster>();

        var scoreGo = CreateText("ScoreText", canvasGo.transform, "Score: 0", 34, TextAnchor.UpperLeft,
            new Vector2(24, -18), new Vector2(420, 44), Color.white);
        var statusGo = CreateText("StatusText", canvasGo.transform, "Swipe to merge tiles", 22, TextAnchor.UpperCenter,
            new Vector2(0, -18), new Vector2(520, 36), new Color(0.85f, 0.9f, 1f));
        var gameOverPanel = new GameObject("GameOverPanel");
        gameOverPanel.transform.SetParent(canvasGo.transform, false);
        var gameOverImage = gameOverPanel.AddComponent<Image>();
        gameOverImage.color = new Color(0f, 0f, 0f, 0.72f);
        var gameOverRect = gameOverPanel.GetComponent<RectTransform>();
        gameOverRect.anchorMin = Vector2.zero;
        gameOverRect.anchorMax = Vector2.one;
        gameOverRect.sizeDelta = Vector2.zero;
        gameOverPanel.SetActive(false);

        var gameOverText = CreateText("GameOverText", gameOverPanel.transform, "Game Over", 42, TextAnchor.MiddleCenter,
            Vector2.zero, new Vector2(640, 120), Color.white);
        gameOverText.rectTransform.anchoredPosition = Vector2.zero;

        var boardRoot = new GameObject("Board");
        boardRoot.transform.SetParent(canvasGo.transform, false);
        var boardRect = boardRoot.AddComponent<RectTransform>();
        boardRect.sizeDelta = new Vector2(520, 520);
        boardRect.anchorMin = new Vector2(0.5f, 0.5f);
        boardRect.anchorMax = new Vector2(0.5f, 0.5f);
        boardRect.anchoredPosition = new Vector2(0, -10f);

        var boardBackground = boardRoot.AddComponent<Image>();
        boardBackground.color = new Color(0.22f, 0.23f, 0.27f);

        const int size = 4;
        const float cellSize = 104f;
        const float gap = 12f;
        var cells = new GridCell[size * size];
        float total = size * cellSize + (size - 1) * gap;
        float startX = -total * 0.5f + cellSize * 0.5f;
        float startY = total * 0.5f - cellSize * 0.5f;

        for (int y = 0; y < size; y++)
        {
            for (int x = 0; x < size; x++)
            {
                var cellGo = new GameObject($"Cell_{x}_{y}");
                cellGo.transform.SetParent(boardRoot.transform, false);
                var rect = cellGo.AddComponent<RectTransform>();
                rect.sizeDelta = new Vector2(cellSize, cellSize);
                rect.anchorMin = new Vector2(0.5f, 0.5f);
                rect.anchorMax = new Vector2(0.5f, 0.5f);
                rect.anchoredPosition = new Vector2(startX + x * (cellSize + gap), startY - y * (cellSize + gap));

                var image = cellGo.AddComponent<Image>();
                image.color = new Color(0.45f, 0.43f, 0.38f);

                var labelGo = new GameObject("Value");
                labelGo.transform.SetParent(cellGo.transform, false);
                var label = labelGo.AddComponent<Text>();
                label.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
                label.fontSize = 36;
                label.alignment = TextAnchor.MiddleCenter;
                label.color = Color.white;
                label.text = "";
                var labelRect = labelGo.GetComponent<RectTransform>();
                labelRect.anchorMin = Vector2.zero;
                labelRect.anchorMax = Vector2.one;
                labelRect.offsetMin = Vector2.zero;
                labelRect.offsetMax = Vector2.zero;

                var cell = cellGo.AddComponent<GridCell>();
                cell.valueText = label;
                cell.background = image;
                cell.SetValue(0, false);
                cells[y * size + x] = cell;
            }
        }

        gm.cells = cells;
        gm.scoreText = scoreGo;
        gm.statusText = statusGo;
        gm.gameOverPanel = gameOverPanel;
        gm.gameOverText = gameOverText;

        if (!AssetDatabase.IsValidFolder("Assets/Scenes"))
        {
            AssetDatabase.CreateFolder("Assets", "Scenes");
        }

        const string scenePath = "Assets/Scenes/2048TemplateDemo.unity";
        EditorSceneManager.SaveScene(scene, scenePath);
        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();

        EditorUtility.DisplayDialog(
            "2048 Scene Created",
            "2048 Template Demo Scene created.\n\nInput: input.direction (up/down/left/right)\nBroadcasts: state.score_update / state.game_over",
            "OK");
    }

    private static Text CreateText(string name, Transform parent, string text, int fontSize, TextAnchor anchor, Vector2 anchoredPosition, Vector2 sizeDelta, Color color)
    {
        var go = new GameObject(name);
        go.transform.SetParent(parent, false);
        var rect = go.AddComponent<RectTransform>();
        rect.anchorMin = new Vector2(0.5f, 1f);
        rect.anchorMax = new Vector2(0.5f, 1f);
        rect.anchoredPosition = anchoredPosition;
        rect.sizeDelta = sizeDelta;

        var label = go.AddComponent<Text>();
        label.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        label.text = text;
        label.fontSize = fontSize;
        label.alignment = anchor;
        label.color = color;
        return label;
    }
}
