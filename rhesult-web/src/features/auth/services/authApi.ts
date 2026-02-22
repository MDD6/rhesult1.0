export type LoginPayload = {
  email: string;
  senha: string;
};

export type LoginResponse = {
  token?: string;
  access_token?: string;
  accessToken?: string;
  message?: string;
  user?: Record<string, unknown>;
};

export async function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
  const url = "/api/auth/login";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Não foi possível entrar. Verifique suas credenciais.";
    try {
      const data = (await response.json()) as { error?: string; message?: string };
      message = data.error || data.message || message;
    } catch {
      const text = await response.text();
      if (text) message = text;
    }
    throw new Error(message);
  }

  return (await response.json()) as LoginResponse;
}
