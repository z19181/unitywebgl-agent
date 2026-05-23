using UnityEngine;

/// <summary>
/// 相机跟随 — v0.2.6 JumpJump Demo
/// </summary>
public class CameraFollow : MonoBehaviour
{
    [Header("跟随设置")]
    public Transform target;
    public Vector3 offset = new Vector3(0, 5, -10);
    public float smoothSpeed = 5f;

    void LateUpdate()
    {
        if (target == null) return;
        Vector3 desired = target.position + offset;
        transform.position = Vector3.Lerp(transform.position, desired, smoothSpeed * Time.deltaTime);
    }

    public void SetTarget(Transform t) { target = t; }
}
