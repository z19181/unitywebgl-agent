using UnityEditor;

public static class WebGLBuild
{
    [MenuItem("Tools/PartyGame/Build WebGL")]
    public static void BuildWebGLInteractive()
    {
        BuildWebGL();
    }

    public static void BuildWebGL()
    {
        JumpJumpWebGLBuilder.BuildWebGL();
    }
}
