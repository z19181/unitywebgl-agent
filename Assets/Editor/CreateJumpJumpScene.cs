using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine.SceneManagement;
using System.IO;

namespace PartyGame.Editor
{
    /// <summary>
    /// Unity Editor 自动搭建脚本
    /// 一键生成跳一跳验证场景
    /// 
    /// 使用方法：
    /// 1. 在 Unity 菜单栏点击：Tools / PartyGame / Create Jump Jump Demo Scene
    /// 2. 等待脚本自动创建场景和配置
    /// 3. 场景会自动保存到 Assets/Scenes/JumpJumpDemo.unity
    /// </summary>
    public class CreateJumpJumpScene
    {
        // 场景保存路径
        private const string SCENE_PATH = "Assets/Scenes/JumpJumpDemo.unity";
        
        // 预制体保存路径
        private const string PREFAB_DIR = "Assets/Prefabs";
        
        // 游戏对象引用（用于配置）
        private static GameObject gameManagerGO;
        private static GameObject partyGameBridgeGO;
        private static GameObject platformSpawnerGO;
        private static GameObject playerSpawnPointGO;
        private static GameObject platformsGO;
        private static GameObject playerPrefab;
        private static GameObject platformPrefab;
        private static GameObject canvasGO;
        private static GameObject mainCamera;
        
        #region 菜单项
        
        /// <summary>
        /// 在 Unity 菜单栏添加：Tools / PartyGame / Create Jump Jump Demo Scene
        /// </summary>
        [MenuItem("Tools/PartyGame/Create Jump Jump Demo Scene")]
        public static void CreateScene()
        {
            Debug.Log("[CreateJumpJumpScene] 开始创建跳一跳验证场景...");
            
            // 1. 创建或清空当前场景
            CreateOrClearScene();
            
            // 2. 获取默认对象（Main Camera, Directional Light）
            GetDefaultObjects();
            
            // 3. 创建游戏对象
            CreateGameObjects();
            
            // 4. 创建预制体
            CreatePrefabs();
            
            // 5. 配置引用
            ConfigureReferences();
            
            // 6. 保存场景
            SaveScene();
            
            Debug.Log("[CreateJumpJumpScene] ✅ 场景创建完成！");
            Debug.Log($"[CreateJumpJumpScene] 场景已保存到：{SCENE_PATH}");
        }
        
        #endregion
        
        #region 场景创建
        
        private static void CreateOrClearScene()
        {
            Debug.Log("[CreateJumpJumpScene] 创建新场景...");
            
            // 创建新场景（包含默认的 Main Camera 和 Directional Light）
            EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);
            
            // 重命名场景
            Scene activeScene = SceneManager.GetActiveScene();
            activeScene.name = "JumpJumpDemo";
            
            Debug.Log($"[CreateJumpJumpScene] 场景已创建：{activeScene.name}");
        }
        
        private static void GetDefaultObjects()
        {
            // 获取 Main Camera
            mainCamera = GameObject.Find("Main Camera");
            
            if (mainCamera == null)
            {
                Debug.LogWarning("[CreateJumpJumpScene] Main Camera 未找到，正在创建...");
                mainCamera = new GameObject("Main Camera");
                mainCamera.AddComponent<Camera>();
                mainCamera.tag = "MainCamera";
            }
            
            // 获取 Directional Light
            GameObject directionalLight = GameObject.Find("Directional Light");
            
            if (directionalLight == null)
            {
                Debug.LogWarning("[CreateJumpJumpScene] Directional Light 未找到，正在创建...");
                directionalLight = new GameObject("Directional Light");
                directionalLight.AddComponent<Light>();
                directionalLight.GetComponent<Light>().type = LightType.Directional;
            }
            
            Debug.Log("[CreateJumpJumpScene] 默认对象已获取");
        }
        
        #endregion
        
        #region 游戏对象创建
        
        private static void CreateGameObjects()
        {
            Debug.Log("[CreateJumpJumpScene] 创建游戏对象...");
            
            // 1. 创建 GameManager
            gameManagerGO = new GameObject("GameManager");
            gameManagerGO.AddComponent<GameManager>();
            
            // 2. 创建 PartyGameBridge
            partyGameBridgeGO = new GameObject("PartyGameBridge");
            partyGameBridgeGO.AddComponent<PartyGameBridge>();
            
            // 3. 创建 PlatformSpawner
            platformSpawnerGO = new GameObject("PlatformSpawner");
            platformSpawnerGO.AddComponent<PlatformSpawner>();
            
            // 4. 创建 PlayerSpawnPoint
            playerSpawnPointGO = new GameObject("PlayerSpawnPoint");
            playerSpawnPointGO.transform.position = new Vector3(0, 1, 0);
            
            // 5. 创建组织节点
            platformsGO = new GameObject("Platforms");
            
            Debug.Log("[CreateJumpJumpScene] ✅ 游戏对象创建完成");
        }
        
        #endregion
        
        #region 预制体创建
        
        private static void CreatePrefabs()
        {
            Debug.Log("[CreateJumpJumpScene] 创建预制体...");
            
            // 创建目录
            if (!Directory.Exists(PREFAB_DIR))
            {
                Directory.CreateDirectory(PREFAB_DIR);
                AssetDatabase.Refresh();
            }
            
            // 1. 创建 Player 预制体
            playerPrefab = CreatePlayerPrefab();
            
            // 2. 创建 Platform 预制体
            platformPrefab = CreatePlatformPrefab();
            
            Debug.Log("[CreateJumpJumpScene] ✅ 预制体创建完成");
        }
        
        private static GameObject CreatePlayerPrefab()
        {
            Debug.Log("[CreateJumpJumpScene] 创建 Player 预制体...");
            
            // 创建 Player GameObject
            GameObject player = new GameObject("Player");
            
            // 添加组件
            player.AddComponent<MeshFilter>();
            player.AddComponent<MeshRenderer>();
            player.AddComponent<Rigidbody>();
            player.AddComponent<BoxCollider>();
            player.AddComponent<PlayerJump>();
            
            // 配置 Rigidbody
            Rigidbody rb = player.GetComponent<Rigidbody>();
            rb.useGravity = true;
            rb.freezeRotation = true; // 冻结旋转
            rb.constraints = RigidbodyConstraints.FreezePositionZ | RigidbodyConstraints.FreezeRotationX | RigidbodyConstraints.FreezeRotationY | RigidbodyConstraints.FreezeRotationZ;
            
            // 配置 BoxCollider
            BoxCollider collider = player.GetComponent<BoxCollider>();
            collider.size = new Vector3(1, 2, 1);
            
            // 配置 PlayerJump
            PlayerJump playerJump = player.GetComponent<PlayerJump>();
            playerJump.baseJumpForce = 10f;
            playerJump.maxChargeMultiplier = 2f;
            playerJump.groundCheckDistance = 1.1f;
            playerJump.groundLayer = LayerMask.GetMask("Default");
            playerJump.enableDebugLog = true;
            
            // 保存为预制体
            string prefabPath = $"{PREFAB_DIR}/Player.prefab";
            GameObject savedPrefab = PrefabUtility.SaveAsPrefabAsset(player, prefabPath);
            
            // 删除场景中的临时对象
            Object.DestroyImmediate(player);
            
            Debug.Log($"[CreateJumpJumpScene] ✅ Player 预制体已创建：{prefabPath}");
            
            return savedPrefab;
        }
        
        private static GameObject CreatePlatformPrefab()
        {
            Debug.Log("[CreateJumpJumpScene] 创建 Platform 预制体...");
            
            // 创建 Platform GameObject
            GameObject platform = new GameObject("Platform");
            
            // 添加组件
            platform.AddComponent<MeshFilter>();
            platform.AddComponent<MeshRenderer>();
            platform.AddComponent<BoxCollider>();
            
            // 配置 BoxCollider
            BoxCollider collider = platform.GetComponent<BoxCollider>();
            collider.size = new Vector3(2, 0.5f, 2);
            
            // 配置 Transform
            platform.transform.localScale = new Vector3(1, 0.5f, 1);
            
            // 设置 Layer（用于落地检测）
            platform.layer = LayerMask.NameToLayer("Default");
            
            // 保存为预制体
            string prefabPath = $"{PREFAB_DIR}/Platform.prefab";
            GameObject savedPrefab = PrefabUtility.SaveAsPrefabAsset(platform, prefabPath);
            
            // 删除场景中的临时对象
            Object.DestroyImmediate(platform);
            
            Debug.Log($"[CreateJumpJumpScene] ✅ Platform 预制体已创建：{prefabPath}");
            
            return savedPrefab;
        }
        
        #endregion
        
        #region 引用配置
        
        private static void ConfigureReferences()
        {
            Debug.Log("[CreateJumpJumpScene] 配置引用...");
            
            // 1. 配置 GameManager
            ConfigureGameManager();
            
            // 2. 配置 PlatformSpawner
            ConfigurePlatformSpawner();
            
            // 3. 配置 CameraFollow
            ConfigureCameraFollow();
            
            // 4. 创建 UI
            CreateUI();
            
            // 5. 创建初始平台
            CreateInitialPlatform();
            
            Debug.Log("[CreateJumpJumpScene] ✅ 引用配置完成");
        }
        
        private static void ConfigureGameManager()
        {
            Debug.Log("[CreateJumpJumpScene] 配置 GameManager...");
            
            GameManager gameManager = gameManagerGO.GetComponent<GameManager>();
            
            // 使用 SerializedObject 修改私有字段
            SerializedObject serializedObject = new SerializedObject(gameManager);
            
            // 设置公开字段
            serializedObject.FindProperty("maxPlayers").intValue = 4;
            serializedObject.FindProperty("platformDistanceRange").vector2Value = new Vector2(3f, 6f);
            serializedObject.FindProperty("jumpForceRange").vector2Value = new Vector2(5f, 15f);
            serializedObject.FindProperty("playerPrefab").objectReferenceValue = playerPrefab;
            serializedObject.FindProperty("platformPrefab").objectReferenceValue = platformPrefab;
            serializedObject.FindProperty("playerSpawnPoint").objectReferenceValue = playerSpawnPointGO.transform;
            
            // 应用修改
            serializedObject.ApplyModifiedProperties();
            
            Debug.Log("[CreateJumpJumpScene] ✅ GameManager 配置完成");
        }
        
        private static void ConfigurePlatformSpawner()
        {
            Debug.Log("[CreateJumpJumpScene] 配置 PlatformSpawner...");
            
            PlatformSpawner platformSpawner = platformSpawnerGO.GetComponent<PlatformSpawner>();
            
            // 使用 SerializedObject 修改私有字段
            SerializedObject serializedObject = new SerializedObject(platformSpawner);
            
            // 设置公开字段
            serializedObject.FindProperty("platformPrefab").objectReferenceValue = platformPrefab;
            serializedObject.FindProperty("initialPlatformCount").intValue = 5;
            serializedObject.FindProperty("distanceRange").vector2Value = new Vector2(3f, 6f);
            serializedObject.FindProperty("platformWidth").floatValue = 2f;
            serializedObject.FindProperty("randomizeSize").boolValue = true;
            
            // 应用修改
            serializedObject.ApplyModifiedProperties();
            
            Debug.Log("[CreateJumpJumpScene] ✅ PlatformSpawner 配置完成");
        }
        
        private static void ConfigureCameraFollow()
        {
            Debug.Log("[CreateJumpJumpScene] 配置 CameraFollow...");
            
            // 添加 CameraFollow 到 Main Camera
            CameraFollow cameraFollow = mainCamera.GetComponent<CameraFollow>();
            
            if (cameraFollow == null)
            {
                cameraFollow = mainCamera.AddComponent<CameraFollow>();
            }
            
            // 使用 SerializedObject 修改私有字段
            SerializedObject serializedObject = new SerializedObject(cameraFollow);
            
            // 设置 target 为 PlayerSpawnPoint
            serializedObject.FindProperty("target").objectReferenceValue = playerSpawnPointGO.transform;
            serializedObject.FindProperty("offset").vector3Value = new Vector3(0, 5, -10);
            serializedObject.FindProperty("smoothSpeed").floatValue = 5f;
            serializedObject.FindProperty("enableDebugLog").boolValue = true;
            
            // 应用修改
            serializedObject.ApplyModifiedProperties();
            
            Debug.Log("[CreateJumpJumpScene] ✅ CameraFollow 配置完成");
        }
        
        #endregion
        
        #region UI 创建
        
        private static void CreateUI()
        {
            Debug.Log("[CreateJumpJumpScene] 创建 UI...");
            
            // 创建 Canvas
            canvasGO = new GameObject("Canvas");
            Canvas canvas = canvasGO.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasGO.AddComponent<UnityEngine.UI.CanvasScaler>();
            canvasGO.AddComponent<UnityEngine.UI.GraphicRaycaster>();
            
            // 创建 ScoreText
            GameObject scoreTextGO = new GameObject("ScoreText");
            scoreTextGO.transform.SetParent(canvasGO.transform);
            UnityEngine.UI.Text scoreText = scoreTextGO.AddComponent<UnityEngine.UI.Text>();
            scoreText.text = "Score: 0";
            scoreText.fontSize = 36;
            scoreText.color = Color.white;
            scoreTextGO.GetComponent<RectTransform>().anchoredPosition = new Vector2(0, -50);
            
            // 创建 StatusText
            GameObject statusTextGO = new GameObject("StatusText");
            statusTextGO.transform.SetParent(canvasGO.transform);
            UnityEngine.UI.Text statusText = statusTextGO.AddComponent<UnityEngine.UI.Text>();
            statusText.text = "Waiting for players...";
            statusText.fontSize = 24;
            statusText.color = Color.yellow;
            statusTextGO.GetComponent<RectTransform>().anchoredPosition = new Vector2(0, -100);
            
            // 创建 GameOverPanel
            GameObject gameOverPanelGO = new GameObject("GameOverPanel");
            gameOverPanelGO.transform.SetParent(canvasGO.transform);
            gameOverPanelGO.SetActive(false); // 默认隐藏
            
            // 添加 UIManager
            GameObject uiManagerGO = new GameObject("UIManager");
            uiManagerGO.AddComponent<UIManager>();
            
            // 配置 UIManager 引用
            UIManager uiManager = uiManagerGO.GetComponent<UIManager>();
            SerializedObject serializedObject = new SerializedObject(uiManager);
            serializedObject.FindProperty("scoreText").objectReferenceValue = scoreText;
            serializedObject.FindProperty("statusText").objectReferenceValue = statusText;
            serializedObject.FindProperty("gameOverPanel").objectReferenceValue = gameOverPanelGO;
            serializedObject.ApplyModifiedProperties();
            
            Debug.Log("[CreateJumpJumpScene] ✅ UI 创建完成");
        }
        
        #endregion
        
        #region 平台创建
        
        private static void CreateInitialPlatform()
        {
            Debug.Log("[CreateJumpJumpScene] 创建初始平台...");
            
            // 实例化 Platform 预制体
            GameObject initialPlatform = PrefabUtility.InstantiatePrefab(platformPrefab) as GameObject;
            initialPlatform.name = "Platform_0";
            initialPlatform.transform.SetParent(platformsGO.transform);
            initialPlatform.transform.position = playerSpawnPointGO.transform.position + Vector3.down * 0.5f;
            
            Debug.Log("[CreateJumpJumpScene] ✅ 初始平台创建完成");
        }
        
        #endregion
        
        #region 场景保存
        
        private static void SaveScene()
        {
            Debug.Log("[CreateJumpJumpScene] 保存场景...");
            
            // 创建目录
            string sceneDirectory = Path.GetDirectoryName(SCENE_PATH);
            if (!Directory.Exists(sceneDirectory))
            {
                Directory.CreateDirectory(sceneDirectory);
            }
            
            // 保存场景
            Scene activeScene = SceneManager.GetActiveScene();
            EditorSceneManager.SaveScene(activeScene, SCENE_PATH);
            
            // 刷新 AssetDatabase
            AssetDatabase.Refresh();
            
            Debug.Log($"[CreateJumpJumpScene] ✅ 场景已保存：{SCENE_PATH}");
        }
        
        #endregion
    }
}
