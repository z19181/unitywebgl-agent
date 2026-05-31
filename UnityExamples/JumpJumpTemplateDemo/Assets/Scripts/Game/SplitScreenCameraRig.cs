using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Minimal camera rig used by JumpJumpGameManager.
/// Keeps the original API alive so the project can compile and run even
/// when split-screen instances are not fully configured.
/// </summary>
public class SplitScreenCameraRig : MonoBehaviour
{
    public Camera primaryCamera;
    public Vector3 cameraOffset = new Vector3(0f, 5f, -10f);
    public float smoothSpeed = 5f;

    private readonly Dictionary<int, Transform> _playerTargets = new Dictionary<int, Transform>();
    private Transform _primaryTarget;

    public static SplitScreenCameraRig Create(Camera primaryCamera)
    {
        var go = new GameObject("SplitScreenCameraRig");
        var rig = go.AddComponent<SplitScreenCameraRig>();
        rig.primaryCamera = primaryCamera;
        rig.Setup();
        return rig;
    }

    public void Setup()
    {
        if (primaryCamera == null)
            primaryCamera = Camera.main;

        if (primaryCamera != null)
            primaryCamera.rect = new Rect(0f, 0f, 1f, 1f);
    }

    public void BindPlayer(int playerIndex, Transform target)
    {
        if (target == null)
            return;

        _playerTargets[playerIndex] = target;

        if (_primaryTarget == null || playerIndex == 0)
        {
            _primaryTarget = target;
            SnapCameraToTarget(target);
        }
    }

    private void LateUpdate()
    {
        if (primaryCamera == null || _primaryTarget == null)
            return;

        var desired = _primaryTarget.position + cameraOffset;
        primaryCamera.transform.position = Vector3.Lerp(
            primaryCamera.transform.position,
            desired,
            Mathf.Clamp01(smoothSpeed * Time.deltaTime)
        );

        primaryCamera.transform.LookAt(_primaryTarget.position);
    }

    private void SnapCameraToTarget(Transform target)
    {
        if (primaryCamera == null || target == null)
            return;

        primaryCamera.transform.position = target.position + cameraOffset;
        primaryCamera.transform.LookAt(target.position);
    }
}
