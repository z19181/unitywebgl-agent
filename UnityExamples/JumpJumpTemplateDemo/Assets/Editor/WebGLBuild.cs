using UnityEngine;

/// <summary>
/// Backward-compatible Unity CLI entry point.
/// Keeps older build scripts working with -executeMethod WebGLBuild.BuildWebGL.
/// </summary>
public static class WebGLBuild
{
    public static void BuildWebGL()
    {
        Debug.Log("[WebGLBuild] Forwarding to JumpJumpWebGLBuilder.BuildWebGL");
        JumpJumpWebGLBuilder.BuildWebGL();
    }
}
