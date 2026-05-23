using System;
using UnityEngine;

public class BallController : MonoBehaviour
{
    [SerializeField] private float speed = 8f;
    [SerializeField] private float minY = -9.5f;

    private Rigidbody2D body;
    private Transform ownerPaddle;
    private bool launched;

    public int ownerIndex { get; private set; }

    public event Action<int> onBrickHit;
    public event Action onBallLost;

    private void Awake()
    {
        body = GetComponent<Rigidbody2D>();
        if (body != null)
        {
            body.gravityScale = 0f;
            body.freezeRotation = true;
        }
    }

    public void Initialize(int playerIndex, Transform paddle, float launchSpeed, float minYBound)
    {
        ownerIndex = playerIndex;
        ownerPaddle = paddle;
        speed = launchSpeed;
        minY = minYBound;
        launched = false;
        if (body != null)
        {
            body.velocity = Vector2.zero;
        }
    }

    public void Launch()
    {
        if (launched)
        {
            return;
        }

        launched = true;
        if (body != null)
        {
            float angle = UnityEngine.Random.Range(-35f, 35f) * Mathf.Deg2Rad;
            Vector2 velocity = new Vector2(Mathf.Sin(angle), Mathf.Cos(angle)).normalized * speed;
            body.velocity = velocity;
        }
    }

    private void Update()
    {
        if (!launched && ownerPaddle != null)
        {
            transform.position = ownerPaddle.position + new Vector3(0f, 0.85f, 0f);
        }

        if (launched && transform.position.y < minY)
        {
            onBallLost?.Invoke();
            Destroy(gameObject);
        }
    }

    private void OnCollisionEnter2D(Collision2D collision)
    {
        if (collision.gameObject.CompareTag("Brick"))
        {
            Destroy(collision.gameObject);
            onBrickHit?.Invoke(10);
        }
    }
}
