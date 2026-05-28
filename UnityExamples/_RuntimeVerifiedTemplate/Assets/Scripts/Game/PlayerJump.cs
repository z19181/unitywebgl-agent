using UnityEngine;

/// <summary>
/// 玩家跳跃控制 — v0.2.6 JumpJump Demo
/// 
/// 职责:
///   - 蓄力跳跃物理
///   - 平台碰撞检测
///   - 分数触发
///   - 阶段管理 (Charging → Jumping → Landing)
/// 
/// 不负责:
///   - 网络通信 (由 JumpJumpGameManager 处理)
///   - 分数广播 (由 JumpJumpGameManager 处理)
/// </summary>
public class PlayerJump : MonoBehaviour
{
    [Header("跳跃参数")]
    public float minJumpForce = 5f;
    public float maxJumpForce = 15f;
    public float minChargeTime = 0.1f;
    public float maxChargeTime = 2f;

    [Header("物理")]
    public float gravity = -20f;
    public float horizontalSpeed = 5f;
    public float fallDeathY = -10f;

    [Header("状态")]
    public int playerIndex = 0;
    public Color playerColor = Color.white;

    // 内部状态
    public enum State { Idle, Charging, Jumping, Dead }
    public State CurrentState { get; private set; } = State.Idle;

    private float chargeStartTime;
    private float currentCharge;
    private Vector3 velocity;
    private CharacterController controller;
    private Renderer rend;
    private Transform spawnPoint;

    // 事件回调
    public System.Action<PlayerJump> OnLandedOnPlatform;
    public System.Action<PlayerJump> OnFellToDeath;

    void Awake()
    {
        controller = GetComponent<CharacterController>();
        if (controller == null) controller = gameObject.AddComponent<CharacterController>();
        rend = GetComponentInChildren<Renderer>();
    }

    void Start()
    {
        if (rend != null) rend.material.color = playerColor;
        controller.enabled = true;
    }

    public void SetSpawnPoint(Transform point)
    {
        spawnPoint = point;
        transform.position = point != null ? point.position : Vector3.zero;
        velocity = Vector3.zero;
        CurrentState = State.Idle;
    }

    public void StartCharge()
    {
        if (CurrentState != State.Idle) return;
        CurrentState = State.Charging;
        chargeStartTime = Time.time;
        currentCharge = 0f;
    }

    public void EndCharge()
    {
        if (CurrentState != State.Charging) return;
        CurrentState = State.Jumping;

        float chargeDuration = Time.time - chargeStartTime;
        float t = Mathf.Clamp01((chargeDuration - minChargeTime) / (maxChargeTime - minChargeTime));
        float force = Mathf.Lerp(minJumpForce, maxJumpForce, t);

        velocity = new Vector3(horizontalSpeed, force, 0);
    }

    public void TapJump()
    {
        if (CurrentState != State.Idle) return;
        CurrentState = State.Jumping;
        velocity = new Vector3(horizontalSpeed, minJumpForce + (maxJumpForce - minJumpForce) * 0.3f, 0);
    }

    public void Kill()
    {
        if (CurrentState == State.Dead) return;
        CurrentState = State.Dead;
        controller.enabled = false;
        OnFellToDeath?.Invoke(this);
    }

    void Update()
    {
        if (CurrentState == State.Idle || CurrentState == State.Charging)
        {
            // Update charge visual
            if (CurrentState == State.Charging)
            {
                float chargeDuration = Time.time - chargeStartTime;
                currentCharge = Mathf.Clamp01((chargeDuration - minChargeTime) / (maxChargeTime - minChargeTime));
            }
            return;
        }

        if (CurrentState == State.Jumping)
        {
            // Apply gravity
            velocity.y += gravity * Time.deltaTime;

            // Move
            controller.Move(velocity * Time.deltaTime);

            // Death check
            if (transform.position.y < fallDeathY)
            {
                Kill();
            }
        }
    }

    void OnControllerColliderHit(ControllerColliderHit hit)
    {
        if (CurrentState != State.Jumping) return;

        // Only count landing when falling down
        if (velocity.y <= 0 && hit.normal.y > 0.5f)
        {
            CurrentState = State.Idle;
            velocity = Vector3.zero;

            // Snap to platform
            transform.position = new Vector3(
                transform.position.x,
                hit.point.y + controller.height * 0.5f,
                transform.position.z
            );

            OnLandedOnPlatform?.Invoke(this);
        }
    }

    public float GetChargeProgress() => currentCharge;
    public float GetVelocity() => velocity.magnitude;
}
