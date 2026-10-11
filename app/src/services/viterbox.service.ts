const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

export type ViterboxVoice = {
  id: string;
  name: string;
  filename: string;
  duration: number;
  url: string;
  download_url: string;
};

export type VoicesResponse = {
  success: boolean;
  count: number;
  voices: ViterboxVoice[];
  viterbox_available: boolean;
};

export type TTSRequest = {
  text: string;
  language: string;
  exaggeration: number;
  cfg_weight: number;
  temperature: number;
  sentence_pause_ms: number;
  voice?: string | null;
};

export type TTSResponse = {
  success: boolean;
  message: string;
  audio_url: string;
  filename: string;
  duration: number;
  text_length: number;
  language: string;
  voice_cloning: boolean;
  voice_used?: string | null;
  params: {
    exaggeration: number;
    cfg_weight: number;
    temperature: number;
    sentence_pause_ms: number;
  };
};

export type UploadVoiceResponse = {
  success: boolean;
  message: string;
  voice: ViterboxVoice;
};

type ApiErrorBody = {
  detail?: string;
  message?: string;
};

async function parseError(response: Response) {
  try {
    const body = (await response.json()) as ApiErrorBody;

    return (
      body.detail ||
      body.message ||
      `Request failed with status ${response.status}`
    );
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

export function absoluteApiUrl(path?: string | null) {
  if (!path) return "";

  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:")
  ) {
    return path;
  }

  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function getVoices(): Promise<VoicesResponse> {
  const response = await fetch(`${API_URL}/v1/viterbox/voices`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function generateTTS(
  payload: TTSRequest,
): Promise<TTSResponse> {
  const response = await fetch(`${API_URL}/v1/viterbox/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function uploadVoice(
  file: File,
): Promise<UploadVoiceResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_URL}/v1/viterbox/voices/upload`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function deleteVoice(filename: string) {
  const response = await fetch(
    `${API_URL}/v1/viterbox/voices/${encodeURIComponent(filename)}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
      },
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}