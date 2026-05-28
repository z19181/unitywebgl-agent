using System.Collections;
using UnityEngine;
using UnityEngine.UI;

public class GridCell : MonoBehaviour
{
    public Image background;
    public Text valueText;

    private Coroutine pulseRoutine;
    private int value;

    public int Value => value;

    public void SetValue(int newValue, bool animate)
    {
        value = newValue;

        if (valueText != null)
        {
            valueText.text = newValue > 0 ? newValue.ToString() : "";
            valueText.color = newValue >= 128 ? Color.white : new Color(0.18f, 0.18f, 0.18f);
        }

        if (background != null)
        {
            background.color = ColorForValue(newValue);
        }

        if (animate && newValue > 0)
        {
            PlayPulse();
        }
    }

    public void Clear()
    {
        SetValue(0, false);
    }

    private void PlayPulse()
    {
        if (pulseRoutine != null)
        {
            StopCoroutine(pulseRoutine);
        }

        pulseRoutine = StartCoroutine(Pulse());
    }

    private IEnumerator Pulse()
    {
        var rect = transform as RectTransform;
        if (rect == null)
        {
            yield break;
        }

        var baseScale = Vector3.one;
        var upScale = Vector3.one * 1.08f;
        float duration = 0.12f;

        for (float t = 0; t < 1f; t += Time.unscaledDeltaTime / duration)
        {
            rect.localScale = Vector3.Lerp(baseScale, upScale, t);
            yield return null;
        }

        for (float t = 0; t < 1f; t += Time.unscaledDeltaTime / duration)
        {
            rect.localScale = Vector3.Lerp(upScale, baseScale, t);
            yield return null;
        }

        rect.localScale = baseScale;
        pulseRoutine = null;
    }

    private Color ColorForValue(int v)
    {
        switch (v)
        {
            case 0: return new Color(0.45f, 0.43f, 0.38f);
            case 2: return new Color(0.93f, 0.89f, 0.85f);
            case 4: return new Color(0.93f, 0.87f, 0.78f);
            case 8: return new Color(0.95f, 0.69f, 0.47f);
            case 16: return new Color(0.96f, 0.58f, 0.39f);
            case 32: return new Color(0.96f, 0.48f, 0.36f);
            case 64: return new Color(0.96f, 0.36f, 0.23f);
            case 128: return new Color(0.93f, 0.81f, 0.44f);
            case 256: return new Color(0.93f, 0.79f, 0.35f);
            case 512: return new Color(0.93f, 0.77f, 0.27f);
            case 1024: return new Color(0.92f, 0.74f, 0.20f);
            case 2048: return new Color(0.92f, 0.71f, 0.13f);
            default: return new Color(0.2f, 0.2f, 0.2f);
        }
    }
}
