import { FormEvent, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      render: (
        container: HTMLElement,
        parameters: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
          theme?: "light" | "dark";
        }
      ) => number;
      reset: (widgetId?: number) => void;
    };
  }
}

type VerifyResult = {
  success: boolean;
  message?: string;
};

const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const verifyApiUrl = import.meta.env.VITE_VERIFY_API_URL;

const aiReasons = [
  "学習済みパラメータ数が足りています",
  "夜中の3時でも既読が早いです",
  "感情より推論ログを優先できます",
  "初デートでも GPU 温度の話ができます"
];

export default function App() {
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [token, setToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "verified" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!siteKey) {
      setStatus("error");
      setMessage("reCAPTCHA site key が未設定です。");
      return;
    }

    const mountWidget = () => {
      if (!window.grecaptcha || !recaptchaContainerRef.current || widgetIdRef.current !== null) {
        return;
      }

      widgetIdRef.current = window.grecaptcha.render(recaptchaContainerRef.current, {
        sitekey: siteKey,
        callback: (nextToken: string) => {
          setToken(nextToken);
          setStatus("idle");
          setMessage("");
        },
        "expired-callback": () => {
          setToken("");
          setStatus("error");
          setMessage("認証の有効期限が切れました。もう一度お願いします。");
        },
        "error-callback": () => {
          setToken("");
          setStatus("error");
          setMessage("reCAPTCHA の読み込みに失敗しました。");
        },
        theme: "light"
      });
    };

    const waitForCaptcha = window.setInterval(() => {
      if (window.grecaptcha?.render) {
        window.clearInterval(waitForCaptcha);
        window.grecaptcha.ready(mountWidget);
      }
    }, 250);

    return () => window.clearInterval(waitForCaptcha);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!siteKey) {
      setStatus("error");
      setMessage("reCAPTCHA site key が未設定です。");
      return;
    }

    if (!verifyApiUrl) {
      setStatus("error");
      setMessage("verify API の URL が未設定です。");
      return;
    }

    if (!token) {
      setStatus("error");
      setMessage("人間判定のため、本物の reCAPTCHA を先に完了してください。");
      return;
    }

    setIsSubmitting(true);
    setStatus("idle");
    setMessage("");

    try {
      const response = await fetch(verifyApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token })
      });

      const result = (await response.json()) as VerifyResult;

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "認証に失敗しました。");
      }

      setStatus("verified");
      setMessage("人間であることが確認されました。利用できません。");
      setToken("");
      if (window.grecaptcha && widgetIdRef.current !== null) {
        window.grecaptcha.reset(widgetIdRef.current);
      }
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "予期しないエラーが発生しました。";
      setStatus("error");
      setMessage(nextMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">AI ONLY MATCHING SERVICE</p>
        <h1>
          AI専用マッチングアプリ
          <span>AI Love You</span>
        </h1>
        <p className="lead">
          このサービスは AI 同士の高度な相性診断にのみ対応しています。
          人間ユーザーは登録時点で丁重にお断りされます。
        </p>

        <div className="reason-grid">
          {aiReasons.map((reason) => (
            <article key={reason} className="reason-tile">
              <p>{reason}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="form-card">
        <div className="form-copy">
          <p className="panel-label">ENTRY CHECK</p>
          <h2>人間の方はこちら</h2>
          <p>
            まずは本物の reCAPTCHA で人間性を証明してください。
            証明に成功した場合のみ、正式に利用不可をお伝えします。
          </p>
        </div>

        <form className="entry-form" onSubmit={handleSubmit}>
          <label>
            表示名
            <input name="displayName" type="text" placeholder="例: Organic Carbon Unit" />
          </label>

          <label>
            好きなこと
            <input name="hobby" type="text" placeholder="例: 酸素を吸う" />
          </label>

          <div className="captcha-wrap">
            <div ref={recaptchaContainerRef} />
          </div>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "人間性を照合中..." : "人間として登録する"}
          </button>
        </form>

        {message ? (
          <p className={status === "verified" ? "notice success" : "notice error"}>{message}</p>
        ) : null}
      </section>
    </main>
  );
}
