using UnityEngine;

public class PaddleController : MonoBehaviour
{
    [Header("Movement")]
    [SerializeField] private float moveSpeed = 12f;
    [SerializeField] private float minX = -7.2f;
    [SerializeField] private float maxX = 7.2f;

    private float horizontalInput;

    public void SetBounds(float min, float max)
    {
        minX = min;
        maxX = max;
    }

    public void Move(float value)
    {
        horizontalInput = Mathf.Clamp(value, -1f, 1f);
    }

    public void Stop()
    {
        horizontalInput = 0f;
    }

    private void Update()
    {
        if (Mathf.Abs(horizontalInput) < 0.001f)
        {
            return;
        }

        float nextX = Mathf.Clamp(transform.position.x + horizontalInput * moveSpeed * Time.deltaTime, minX, maxX);
        transform.position = new Vector3(nextX, transform.position.y, transform.position.z);
    }
}
