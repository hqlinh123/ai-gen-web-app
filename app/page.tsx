/* eslint-disable react-hooks/preserve-manual-memoization */
/* eslint-disable react-hooks/set-state-in-effect */







"use client";







import {



  ChangeEvent,
  FormEvent,



  useEffect,



  useMemo,



  useRef,



  useState,



} from "react";







const API_URL =



  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||



  "http://localhost:8000";







// ============================================================



// TYPES



// ============================================================







type ViterboxVoice = {



  id: string;



  name: string;



  filename: string;



  duration: number;



  url: string;



  download_url: string;



};







type VoicesResponse = {



  success: boolean;



  count?: number;



  voices: ViterboxVoice[];



  viterbox_available?: boolean;



};







type TTSResponse = {



  success: boolean;



  message: string;



  audio_url: string;



  filename: string;



  duration: number;



  text_length: number;



  language: string;



  voice_cloning: boolean;



  voice_used?: string | null;



  params?: {



    exaggeration: number;



    cfg_weight: number;



    temperature: number;



    sentence_pause_ms: number;



  };



};







type UploadVoiceResponse = {



  success: boolean;



  message: string;



  voice: ViterboxVoice;



};







type AppTab = "home" | "create" | "voices" | "videos" | "profile";



type GeneratedVoice = {

  id: string;

  filename: string;

  duration: number;

  audio_url: string;

  created_at: string;

  language?: string;

  text_length?: number;

  text?: string;

};



type GeneratedVoicesResponse = {

  success: boolean;

  count: number;

  voices: GeneratedVoice[];

};



type GeneratedVideo = {
  id: string;
  filename: string;
  video_url: string;
  thumbnail_url?: string | null;
  duration?: number;
  size?: number;
  created_at: string;
};

type GeneratedVideosResponse = {
  success: boolean;
  count: number;
  videos: GeneratedVideo[];
};

type GenerateVideoResponse = {
  success: boolean;
  message: string;
  id: string;
  filename: string;
  video_url: string;
  voice_url: string;
  image_url?: string | null;
  prompt: string;
  style: string;
  aspect_ratio: string;
  duration: number;
  created_at: string;
};


type GeneratedImage = {
  id?: string;
  filename: string;
  image_url: string;
  created_at?: string;
};

type GeneratedImagesResponse = {
  success: boolean;
  count?: number;
  images: GeneratedImage[];
};

type RunwayVideoResponse = {
  success: boolean;
  message?: string;
  id?: string;
  filename: string;
  video_url: string;
  duration?: number;
  created_at?: string;
};

type RunwayImageResponse = {
  success: boolean;
  message?: string;
  id?: string;
  filename: string;
  image_url: string;
  created_at?: string;
};

type CreationType =
  | "text_to_voice"
  | "text_to_video"
  | "image_to_video"
  | "video_to_video"
  | "video_reference_to_video"
  | "text_to_image"
  | "image_to_image";



type ApiErrorBody = {



  detail?: string;



  message?: string;



};

type AuthUser = {
  id: number | string;
  email: string;
  full_name?: string | null;
  name?: string | null;
};

type AuthData = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  email: string;
  name: string;
  is_email_verified: boolean;
  user_id: number | string | null;
};

type AuthResponse = {
  success: boolean;
  message: string;
  data: AuthData;
  error: unknown | null;
  timestamp: string;
};

type AuthMode = "login" | "register";

const ACCESS_TOKEN_KEY = "creator_ai_access_token";
const REFRESH_TOKEN_KEY = "creator_ai_refresh_token";
const AUTH_USER_KEY = "creator_ai_user";








// ============================================================



// CONSTANTS



// ============================================================







const LANGUAGES = [



  { value: "vi", label: "Tiếng Việt" },



  { value: "en", label: "English" },



  { value: "es", label: "Español" },



  { value: "fr", label: "Français" },



  { value: "de", label: "Deutsch" },



  { value: "zh", label: "中文" },



  { value: "ja", label: "日本語" },



  { value: "ko", label: "한국어" },



];







// ============================================================



// URL HELPERS



// ============================================================







function absoluteApiUrl(path?: string | null) {



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







/*\\\*



 \\\* IMPORTANT:



 \\\*



 \\\* Backend main.py:



 \\\*



 \\\* app.mount("/wavs", StaticFiles(...))



 \\\*



 \\\* => voice preview URL ALWAYS:



 \\\*



 \\\* http://localhost:8000/wavs/filename.wav



 */



function getVoiceAudioUrl(voice?: ViterboxVoice | null) {



  if (!voice) return "";







  // Prefer the actual static route mounted by FastAPI.



  if (voice.filename) {



    return absoluteApiUrl(



      `/wavs/${encodeURIComponent(voice.filename)}`,



    );



  }







  return absoluteApiUrl(voice.url);



}







// ============================================================



// API HELPERS



// ============================================================







async function parseApiError(response: Response) {



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








function getAccessToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ACCESS_TOKEN_KEY) || "";
}

function getRefreshToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(REFRESH_TOKEN_KEY) || "";
}

function authHeaders(extra: HeadersInit = {}): HeadersInit {
  const token = getAccessToken();

  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function saveAuthSession(
  response: AuthResponse,
  fallbackUser?: AuthUser,
) {
  if (typeof window === "undefined") return;

  const data = response.data;

  window.localStorage.setItem(
    ACCESS_TOKEN_KEY,
    data.access_token,
  );

  window.localStorage.setItem(
    REFRESH_TOKEN_KEY,
    data.refresh_token,
  );

  const user: AuthUser = {
    id: data.user_id ?? fallbackUser?.id ?? "",
    email: data.email || fallbackUser?.email || "",
    full_name: data.name || fallbackUser?.full_name || null,
    name: data.name || fallbackUser?.name || null,
  };

  window.localStorage.setItem(
    AUTH_USER_KEY,
    JSON.stringify(user),
  );
}

function clearAuthSession() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
}

function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(AUTH_USER_KEY);
    return value ? (JSON.parse(value) as AuthUser) : null;
  } catch {
    return null;
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    clearAuthSession();
    return null;
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/v1/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        clearAuthSession();
        return null;
      }

      const result = (await response.json()) as AuthResponse;
      const data = result?.data;

      if (!data?.access_token) {
        clearAuthSession();
        return null;
      }

      window.localStorage.setItem(
        ACCESS_TOKEN_KEY,
        data.access_token,
      );

      // Support refresh-token rotation. If BE returns a new refresh token,
      // replace the old one; otherwise keep the current refresh token.
      if (data.refresh_token) {
        window.localStorage.setItem(
          REFRESH_TOKEN_KEY,
          data.refresh_token,
        );
      }

      // Refresh responses may also contain updated user information.
      const currentUser = getStoredUser();
      if (currentUser && (data.email || data.name || data.user_id != null)) {
        const nextUser: AuthUser = {
          id: data.user_id ?? currentUser.id,
          email: data.email || currentUser.email,
          full_name: data.name || currentUser.full_name || null,
          name: data.name || currentUser.name || null,
        };

        window.localStorage.setItem(
          AUTH_USER_KEY,
          JSON.stringify(nextUser),
        );
      }

      return data.access_token;
    } catch (error) {
      console.error("[AUTH] refresh token error:", error);
      clearAuthSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const createHeaders = (token: string) => {
    const headers = new Headers(init.headers || {});

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (!headers.has("ngrok-skip-browser-warning")) {
      headers.set("ngrok-skip-browser-warning", "true");
    }

    return headers;
  };

  let response = await fetch(input, {
    ...init,
    headers: createHeaders(getAccessToken()),
  });

  // Access token expired/invalid -> refresh once, then retry the original API.
  if (response.status !== 401) {
    return response;
  }

  const newAccessToken = await refreshAccessToken();

  if (!newAccessToken) {
    return response;
  }

  response = await fetch(input, {
    ...init,
    headers: createHeaders(newAccessToken),
  });

  return response;
}


async function loginAccount(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.password,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return response.json();
}

async function registerAccount(payload: {
  full_name: string;
  email: string;
  password: string;
}): Promise<AuthResponse | null> {
  const response = await fetch(`${API_URL}/v1/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({
      name: payload.full_name.trim(),
      email: payload.email.trim(),
      password: payload.password,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const data = await response.json();

  // Some backends return a token immediately after registration.
  if (data?.data?.access_token) {
    return data as AuthResponse;
  }

  return null;
}

async function getVoices(): Promise<VoicesResponse> {



  const response = await apiFetch(`${API_URL}/v1/viterbox/voices`, {



    method: "GET",







    headers: authHeaders({



      Accept: "application/json",



      "ngrok-skip-browser-warning": "true",



    }),







    cache: "no-store",



  });







  if (!response.ok) {



    throw new Error(await parseApiError(response));



  }







  return response.json();



}







async function getGeneratedVoices(): Promise<GeneratedVoicesResponse> {

  const response = await apiFetch(`${API_URL}/v1/viterbox/outputs`, {

    method: "GET",

    headers: authHeaders({
      Accept: "application/json",

      "ngrok-skip-browser-warning": "true",
    }),

    cache: "no-store",

  });



  if (!response.ok) {

    throw new Error(await parseApiError(response));

  }



  return response.json();

}





async function generateTTS(payload: {



  text: string;



  language: string;



  exaggeration: number;



  cfg_weight: number;



  temperature: number;



  sentence_pause_ms: number;



  voice?: string | null;



}): Promise<TTSResponse> {



  const response = await apiFetch(`${API_URL}/v1/viterbox/tts`, {



    method: "POST",







    headers: authHeaders({



      "Content-Type": "application/json",



      Accept: "application/json",



      "ngrok-skip-browser-warning": "true",



    }),







    body: JSON.stringify(payload),



  });







  if (!response.ok) {



    throw new Error(await parseApiError(response));



  }







  return response.json();



}







async function uploadVoice(



  file: File,



): Promise<UploadVoiceResponse> {



  const formData = new FormData();







  formData.append("file", file);







  const response = await apiFetch(



    `${API_URL}/v1/viterbox/voices/upload`,



    {



      method: "POST",







      headers: authHeaders({
        Accept: "application/json",



        "ngrok-skip-browser-warning": "true",
      }),







      body: formData,



    },



  );







  if (!response.ok) {



    throw new Error(await parseApiError(response));



  }







  return response.json();



}







async function getGeneratedVideos(): Promise<GeneratedVideosResponse> {
  const response = await apiFetch(`${API_URL}/v1/videos`, {
    method: "GET",
    headers: authHeaders({
      Accept: "application/json",
      "ngrok-skip-browser-warning": "true",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return response.json();
}


async function generateVideo(payload: {
  voiceUrl: string;
  images: File[];
  prompt: string;
  style: string;
  aspectRatio: string;
}): Promise<GenerateVideoResponse> {
  const formData = new FormData();
  formData.append("voice_url", payload.voiceUrl);
  payload.images.forEach((image) => formData.append("images", image));
  formData.append("prompt", payload.prompt);
  formData.append("style", payload.style);
  formData.append("aspect_ratio", payload.aspectRatio);

  const response = await apiFetch(`${API_URL}/v1/videos/generate`, {
    method: "POST",
    headers: authHeaders({
      Accept: "application/json",
      "ngrok-skip-browser-warning": "true",
    }),
    body: formData,
  });

  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json();
}

async function generateTextToVideo(payload: {
  prompt: string;
  style: string;
  aspectRatio: string;
  duration: number;
}): Promise<RunwayVideoResponse> {
  const formData = new FormData();
  formData.append("prompt", payload.prompt);
  formData.append("style", payload.style);
  formData.append("aspect_ratio", payload.aspectRatio);
  formData.append("duration", String(payload.duration));

  const response = await apiFetch(`${API_URL}/v1/videos/text-to-video`, {
    method: "POST",
    headers: authHeaders({ Accept: "application/json", "ngrok-skip-browser-warning": "true" }),
    body: formData,
  });

  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json();
}

async function generateImageToVideo(payload: {
  images: File[];
  prompt: string;
  style: string;
  aspectRatio: string;
  duration: number;
}): Promise<RunwayVideoResponse> {
  const formData = new FormData();
  payload.images.forEach((image) => formData.append("images", image));
  formData.append("prompt", payload.prompt);
  formData.append("style", payload.style);
  formData.append("aspect_ratio", payload.aspectRatio);
  formData.append("duration", String(payload.duration));

  const response = await apiFetch(`${API_URL}/v1/videos/image-to-video`, {
    method: "POST",
    headers: authHeaders({ Accept: "application/json", "ngrok-skip-browser-warning": "true" }),
    body: formData,
  });

  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json();
}

async function generateVideoToVideo(payload: {
  video: File;
  images?: File[];
  prompt: string;
  style: string;
  aspectRatio: string;
}): Promise<RunwayVideoResponse> {
  const formData = new FormData();
  formData.append("video", payload.video);
  payload.images?.forEach((image) => formData.append("images", image));
  formData.append("prompt", payload.prompt);
  formData.append("style", payload.style);
  formData.append("aspect_ratio", payload.aspectRatio);

  const endpoint = payload.images?.length
    ? "/v1/videos/video-to-video/references"
    : "/v1/videos/video-to-video";

  const response = await apiFetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: authHeaders({ Accept: "application/json", "ngrok-skip-browser-warning": "true" }),
    body: formData,
  });

  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json();
}

async function generateTextToImage(payload: {
  prompt: string;
  style: string;
  aspectRatio: string;
}): Promise<RunwayImageResponse> {
  const formData = new FormData();
  formData.append("prompt", payload.prompt);
  formData.append("style", payload.style);
  formData.append("aspect_ratio", payload.aspectRatio);

  const response = await apiFetch(`${API_URL}/v1/videos/text-to-image`, {
    method: "POST",
    headers: authHeaders({ Accept: "application/json", "ngrok-skip-browser-warning": "true" }),
    body: formData,
  });

  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json();
}

async function generateImageToImage(payload: {
  images: File[];
  prompt: string;
  style: string;
  aspectRatio: string;
}): Promise<RunwayImageResponse> {
  const formData = new FormData();
  payload.images.forEach((image) => formData.append("images", image));
  formData.append("prompt", payload.prompt);
  formData.append("style", payload.style);
  formData.append("aspect_ratio", payload.aspectRatio);

  const response = await apiFetch(`${API_URL}/v1/videos/image-to-image`, {
    method: "POST",
    headers: authHeaders({ Accept: "application/json", "ngrok-skip-browser-warning": "true" }),
    body: formData,
  });

  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json();
}

async function getGeneratedImages(): Promise<GeneratedImagesResponse> {
  const response = await apiFetch(`${API_URL}/v1/videos/images`, {
    method: "GET",
    headers: authHeaders({ Accept: "application/json", "ngrok-skip-browser-warning": "true" }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json();
}


// ============================================================



// AUDIO HELPERS



// ============================================================




async function fetchVideoBlob(path: string): Promise<Blob> {
  const url = absoluteApiUrl(path);

  console.log("[VIDEO] GET:", url);

  const response = await apiFetch(url, {
    method: "GET",
    headers: authHeaders({
      Accept: "video/mp4,video/*,*/*",
      "ngrok-skip-browser-warning": "true",
    }),
  });

  console.log(
    "[VIDEO] response:",
    response.status,
    response.headers.get("content-type"),
    response.headers.get("content-length"),
  );

  if (!response.ok) {
    throw new Error(
      `Cannot load video (${response.status}): ${url}`,
    );
  }

  const blob = await response.blob();

  console.log(
    "[VIDEO] blob:",
    blob.type,
    blob.size,
  );

  if (!blob.size) {
    throw new Error("Video file is empty.");
  }

  return blob.type.startsWith("video/")
    ? blob
    : new Blob([blob], { type: "video/mp4" });
}


async function fetchAudioBlob(path: string) {



  const url = absoluteApiUrl(path);







  console.log("[AUDIO] GET:", url);







  const response = await apiFetch(url, {



    method: "GET",







    headers: authHeaders({



      Accept: "audio/*,*/*",



      "ngrok-skip-browser-warning": "true",



    }),



  });







  console.log(



    "[AUDIO] response:",



    response.status,



    response.headers.get("content-type"),



  );







  if (!response.ok) {



    throw new Error(



      `Cannot load audio (${response.status}): ${url}`,



    );



  }







  const blob = await response.blob();







  console.log(



    "[AUDIO] blob:",



    blob.type,



    blob.size,



  );







  if (!blob.size) {



    throw new Error("Audio file is empty.");



  }







  return blob;



}







async function downloadAudioFile(



  path: string,



  filename: string,



) {



  const blob = await fetchAudioBlob(path);







  const objectUrl = URL.createObjectURL(blob);







  try {



    const anchor = document.createElement("a");







    anchor.href = objectUrl;







    anchor.download =



      filename || "audio.wav";







    anchor.style.display = "none";







    document.body.appendChild(anchor);







    anchor.click();







    anchor.remove();



  } finally {



    window.setTimeout(() => {



      URL.revokeObjectURL(objectUrl);



    }, 1000);



  }



}







// ============================================================



// HELPERS



// ============================================================







function formatDuration(value?: number) {



  if (



    value === undefined ||



    value === null ||



    !Number.isFinite(value)



  ) {



    return "0:00";



  }







  const minutes = Math.floor(value / 60);







  const seconds = Math.floor(value % 60);







  return `${minutes}:${seconds



    .toString()



    .padStart(2, "0")}`;



}







// ============================================================



// ICONS



// ============================================================




function AuthVideo({
  src,
  poster,
  autoPlay = false,
  className = "",
}: {
  src: string;
  poster?: string | null;
  autoPlay?: boolean;
  className?: string;
}) {
  const [videoUrl, setVideoUrl] = useState("");
  const [videoError, setVideoError] = useState("");

  useEffect(() => {
    let objectUrl = "";
    let cancelled = false;

    async function loadVideo() {
      try {
        setVideoError("");
        setVideoUrl("");

        const blob = await fetchVideoBlob(src);

        if (cancelled) return;

        objectUrl = URL.createObjectURL(blob);
        setVideoUrl(objectUrl);
      } catch (error) {
        console.error("[VIDEO] load error:", error);

        if (!cancelled) {
          setVideoError(
            error instanceof Error
              ? error.message
              : "Unable to load video.",
          );
        }
      }
    }

    if (src) {
      void loadVideo();
    }

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  if (videoError) {
    return (
      <div className="flex aspect-video items-center justify-center bg-slate-950 p-4 text-center text-xs text-red-400">
        {videoError}
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className="flex aspect-video items-center justify-center bg-slate-950">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    );
  }

  return (
    <video
      controls
      autoPlay={autoPlay}
      playsInline
      preload="metadata"
      src={videoUrl}
      poster={
        poster
          ? absoluteApiUrl(poster)
          : undefined
      }
      className={className}
      onError={(event) => {
        console.error(
          "[VIDEO] player error:",
          event.currentTarget.error,
        );
      }}
    />
  );
}


function SparklesIcon({



  className = "h-5 w-5",



}: {



  className?: string;



}) {



  return (



    <svg



      className={className}



      viewBox="0 0 24 24"



      fill="none"



      stroke="currentColor"



      strokeWidth="1.8"



      strokeLinecap="round"



      strokeLinejoin="round"



    >



      <path d="M12 3l1.2 3.4L16.5 8l-3.3 1.5L12 13l-1.3-3.5L7.5 8l3.2-1.6L12 3Z" />



      <path d="M18.5 13.5l.7 2 1.8.8-1.8.8-.7 2-.8-2-1.7-.8 1.7-.8.8-2Z" />



      <path d="M5 13l.9 2.5L8 16.5l-2.1 1L5 20l-.9-2.5-2.1-1 2.1-1L5 13Z" />



    </svg>



  );



}







function HomeIcon() {



  return (



    <svg



      className="h-5 w-5"



      viewBox="0 0 24 24"



      fill="none"



      stroke="currentColor"



      strokeWidth="1.8"



    >



      <path d="M3 10.5 12 3l9 7.5" />



      <path d="M5 9.5V21h14V9.5" />



      <path d="M9 21v-6h6v6" />



    </svg>



  );



}







function UserIcon() {



  return (



    <svg



      className="h-5 w-5"



      viewBox="0 0 24 24"



      fill="none"



      stroke="currentColor"



      strokeWidth="1.8"



    >



      <circle cx="12" cy="8" r="4" />



      <path d="M4 21c.7-4.3 3.4-6.5 8-6.5s7.3 2.2 8 6.5" />



    </svg>



  );



}







function PlusIcon({



  className = "h-5 w-5",



}: {



  className?: string;



}) {



  return (



    <svg



      className={className}



      viewBox="0 0 24 24"



      fill="none"



      stroke="currentColor"



      strokeWidth="2"



      strokeLinecap="round"



    >



      <path d="M12 5v14M5 12h14" />



    </svg>



  );



}







function MicIcon({



  className = "h-5 w-5",



}: {



  className?: string;



}) {



  return (



    <svg



      className={className}



      viewBox="0 0 24 24"



      fill="none"



      stroke="currentColor"



      strokeWidth="1.8"



      strokeLinecap="round"



    >



      <rect x="8" y="3" width="8" height="12" rx="4" />



      <path d="M5 11a7 7 0 0 0 14 0" />



      <path d="M12 18v3" />



    </svg>



  );



}







function VideoIcon({ className = "h-5 w-5" }: { className?: string }) {

  return (

    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">

      <rect x="3" y="5" width="14" height="14" rx="2" />

      <path d="m17 10 4-2v8l-4-2" />

    </svg>

  );

}



function UploadIcon({



  className = "h-5 w-5",



}: {



  className?: string;



}) {



  return (



    <svg



      className={className}



      viewBox="0 0 24 24"



      fill="none"



      stroke="currentColor"



      strokeWidth="1.8"



      strokeLinecap="round"



      strokeLinejoin="round"



    >



      <path d="M12 16V4" />



      <path d="m7 9 5-5 5 5" />



      <path d="M5 20h14" />



    </svg>



  );



}







function ChevronDownIcon() {



  return (



    <svg



      className="h-4 w-4"



      viewBox="0 0 24 24"



      fill="none"



      stroke="currentColor"



      strokeWidth="2"



    >



      <path d="m6 9 6 6 6-6" />



    </svg>



  );



}







function SettingsIcon() {



  return (



    <svg



      className="h-5 w-5"



      viewBox="0 0 24 24"



      fill="none"



      stroke="currentColor"



      strokeWidth="1.8"



      strokeLinecap="round"



      strokeLinejoin="round"



    >



      <circle cx="12" cy="12" r="3" />



      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />



    </svg>



  );



}







function DownloadIcon() {



  return (



    <svg



      className="h-4 w-4"



      viewBox="0 0 24 24"



      fill="none"



      stroke="currentColor"



      strokeWidth="1.8"



      strokeLinecap="round"



      strokeLinejoin="round"



    >



      <path d="M12 4v12" />



      <path d="m7 11 5 5 5-5" />



      <path d="M5 20h14" />



    </svg>



  );



}







function CheckIcon() {



  return (



    <svg



      className="h-3.5 w-3.5"



      viewBox="0 0 24 24"



      fill="none"



      stroke="currentColor"



      strokeWidth="2.5"



      strokeLinecap="round"



      strokeLinejoin="round"



    >



      <path d="m5 12 4 4L19 6" />



    </svg>



  );



}







// ============================================================



// RANGE



// ============================================================







function RangeSetting({



  label,



  description,



  value,



  min,



  max,



  step,



  suffix = "",



  onChange,



}: {



  label: string;



  description: string;



  value: number;



  min: number;



  max: number;



  step: number;



  suffix?: string;



  onChange: (value: number) => void;



}) {



  return (



    <div>



      <div className="mb-2 flex items-start justify-between gap-3">



        <div>



          <p className="text-[11px] font-semibold text-slate-700">



            {label}



          </p>







          <p className="text-[9px] text-slate-400">



            {description}



          </p>



        </div>







        <span className="rounded-md bg-white px-2 py-1 text-[10px] font-bold text-slate-600 shadow-sm">



          {value}



          {suffix}



        </span>



      </div>







      <input



        type="range"



        value={value}



        min={min}



        max={max}



        step={step}



        onChange={(event) =>



          onChange(Number(event.target.value))



        }



        className="w-full accent-indigo-600"



      />



    </div>



  );



}







// ============================================================



// PAGE



// ============================================================







export default function Home() {
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");




  const fileInputRef =



    useRef<HTMLInputElement>(null);







  const [text, setText] = useState("");







  const [language, setLanguage] =



    useState("vi");







  const [voices, setVoices] = useState<



    ViterboxVoice[]



  >([]);







  const [selectedVoice, setSelectedVoice] =



    useState("");







  const [loadingVoices, setLoadingVoices] =



    useState(true);







  const [loadingPreview, setLoadingPreview] =



    useState(false);







  const [generating, setGenerating] =



    useState(false);







  const [uploading, setUploading] =



    useState(false);







  const [downloading, setDownloading] =



    useState(false);







  const [showAdvanced, setShowAdvanced] =



    useState(false);







  const [exaggeration, setExaggeration] =



    useState(0.5);







  const [cfgWeight, setCfgWeight] =



    useState(0.5);







  const [temperature, setTemperature] =



    useState(0.8);







  const [sentencePause, setSentencePause] =



    useState(500);







  const [result, setResult] =



    useState<TTSResponse | null>(null);







  const [voicePreviewUrl, setVoicePreviewUrl] =



    useState("");







  const [resultAudioUrl, setResultAudioUrl] =



    useState("");







  const [error, setError] = useState("");







  const [apiConnected, setApiConnected] =



    useState(false);



  const [activeTab, setActiveTab] = useState<AppTab>("home");

  const [generatedVoices, setGeneratedVoices] = useState<GeneratedVoice[]>([]);

  const [loadingGeneratedVoices, setLoadingGeneratedVoices] = useState(false);

  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);

  const [loadingGeneratedVideos, setLoadingGeneratedVideos] = useState(false);

  const [videoVoice, setVideoVoice] = useState<GeneratedVoice | null>(null);







  useEffect(() => {
    const token = getAccessToken();

    if (token) {
      setCurrentUser(getStoredUser() || {
        id: "",
        email: "Signed in",
      });
    }

    setAuthReady(true);
  }, []);

  const handleLogin = async (payload: {
    email: string;
    password: string;
  }) => {
    try {
      setAuthLoading(true);
      setAuthError("");

      const response = await loginAccount(payload);

      const fallbackUser: AuthUser = {
        id: "",
        email: payload.email.trim(),
      };
      console.log('response', response)
      saveAuthSession(response, fallbackUser);
      setCurrentUser({
        id: response.data.user_id ?? fallbackUser.id,
        email: response.data.email || fallbackUser.email,
        full_name: response.data.name || null,
        name: response.data.name || null,
      });

      // Reload user-scoped generation history after authentication.
      await Promise.allSettled([
        loadGeneratedVideos(),
        loadGeneratedVoices(),
      ]);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "Unable to sign in.",
      );
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (payload: {
    full_name: string;
    email: string;
    password: string;
  }) => {
    try {
      setAuthLoading(true);
      setAuthError("");

      const response = await registerAccount(payload);

      if (response?.data.access_token) {
        const fallbackUser: AuthUser = {
          id: "",
          email: payload.email.trim(),
          full_name: payload.full_name.trim(),
        };

        saveAuthSession(response, fallbackUser);
        setCurrentUser({
          id: response.data.user_id ?? fallbackUser.id,
          email: response.data.email || fallbackUser.email,
          full_name: response.data.name || null,
          name: response.data.name || null,
        });
        return;
      }

      // Backend created the account but did not return a token.
      // Login immediately so the user does not have to re-enter credentials.
      const loginResponse = await loginAccount({
        email: payload.email,
        password: payload.password,
      });

      const fallbackUser: AuthUser = {
        id: "",
        email: payload.email.trim(),
        full_name: payload.full_name.trim(),
      };

      saveAuthSession(loginResponse, fallbackUser);
      setCurrentUser({
        id: loginResponse.data.user_id ?? fallbackUser.id,
        email: loginResponse.data.email || fallbackUser.email,
        full_name: loginResponse.data.name || null,
        name: loginResponse.data.name || null,
      });
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "Unable to create account.",
      );
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    setCurrentUser(null);
    setGeneratedVideos([]);
    setActiveTab("home");
    setAuthMode("login");
    setAuthError("");
  };


  // ============================================================



  // SELECTED VOICE



  // ============================================================







  const selectedVoiceData = useMemo(



    () =>



      voices.find(



        (voice) =>



          voice.filename === selectedVoice,



      ),



    [voices, selectedVoice],



  );







  // ============================================================



  // LOAD VOICES



  // ============================================================







  const loadVoices = async () => {



    try {



      setLoadingVoices(true);







      setError("");







      const response = await getVoices();







      console.log(



        "[VITERBOX] voices:",



        response,



      );







      setApiConnected(true);







      const items = response.voices || [];







      setVoices(items);







      if (items.length) {



        setSelectedVoice((current) => {



          const exists = items.some(



            (voice) =>



              voice.filename === current,



          );







          return exists



            ? current



            : items[0].filename;



        });



      } else {



        setSelectedVoice("");



      }







      if (



        response.viterbox_available === false



      ) {



        setError(



          "Viterbox model is currently unavailable.",



        );



      }



    } catch (err) {



      console.error(



        "[VITERBOX] load voices error:",



        err,



      );







      setApiConnected(false);







      setError(



        err instanceof Error



          ? err.message



          : "Unable to connect to Viterbox API.",



      );



    } finally {



      setLoadingVoices(false);



    }



  };







  const loadGeneratedVoices = async () => {

    try {

      setLoadingGeneratedVoices(true);



      const response = await getGeneratedVoices();



      console.log(

        "[VITERBOX] generated voices:",

        response,

      );



      setGeneratedVoices(response.voices || []);

    } catch (err) {

      console.error(

        "[VITERBOX] load generated voices error:",

        err,

      );



      setError(

        err instanceof Error

          ? err.message

          : "Unable to load generated voices.",

      );

    } finally {

      setLoadingGeneratedVoices(false);

    }

  };





  const loadGeneratedVideos = async () => {
    try {
      setLoadingGeneratedVideos(true);

      const response = await getGeneratedVideos();

      console.log("[VIDEO] generated videos:", response);

      setGeneratedVideos(response.videos || []);
    } catch (err) {
      console.error("[VIDEO] load generated videos error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load generated videos.",
      );
    } finally {
      setLoadingGeneratedVideos(false);
    }
  };


  useEffect(() => {
    if (!authReady || !currentUser) return;

    void loadVoices();
    void loadGeneratedVoices();
    void loadGeneratedVideos();
  }, [authReady, currentUser]);







  // ============================================================



  // LOAD SELECTED VOICE AUDIO



  // ============================================================







  useEffect(() => {



    let objectUrl = "";



    let cancelled = false;







    async function loadAudio() {



      if (!selectedVoiceData) {



        setVoicePreviewUrl("");



        return;



      }







      try {



        setLoadingPreview(true);







        const voiceUrl =



          getVoiceAudioUrl(



            selectedVoiceData,



          );







        console.log(



          "[VITERBOX] preview voice:",



          voiceUrl,



        );







        const blob =



          await fetchAudioBlob(voiceUrl);







        if (cancelled) return;







        objectUrl =



          URL.createObjectURL(blob);







        setVoicePreviewUrl(objectUrl);



      } catch (err) {



        console.error(



          "[VITERBOX] preview error:",



          err,



        );







        if (!cancelled) {



          setVoicePreviewUrl("");







          setError(



            err instanceof Error



              ? err.message



              : "Unable to load voice preview.",



          );



        }



      } finally {



        if (!cancelled) {



          setLoadingPreview(false);



        }



      }



    }







    loadAudio();







    return () => {



      cancelled = true;







      if (objectUrl) {



        URL.revokeObjectURL(



          objectUrl,



        );



      }



    };



  }, [selectedVoiceData]);







  // ============================================================



  // GENERATE



  // ============================================================







  const handleGenerate = async () => {



    if (!text.trim() || generating) {



      return;



    }







    try {



      setGenerating(true);







      setError("");







      setResult(null);







      if (resultAudioUrl) {



        URL.revokeObjectURL(



          resultAudioUrl,



        );







        setResultAudioUrl("");



      }







      const response =



        await generateTTS({



          text: text.trim(),



          language,



          voice:



            selectedVoice || null,



          exaggeration,



          cfg_weight: cfgWeight,



          temperature,



          sentence_pause_ms:



            sentencePause,



        });







      console.log(



        "[VITERBOX] TTS response:",



        response,



      );







      setResult(response);



      // Reload generated voices from BE so the Voices tab always reflects OUTPUT_DIR.

      await loadGeneratedVoices();







      if (response.audio_url) {



        const blob =



          await fetchAudioBlob(



            response.audio_url,



          );







        const objectUrl =



          URL.createObjectURL(blob);







        setResultAudioUrl(



          objectUrl,



        );



      }



    } catch (err) {



      console.error(



        "[VITERBOX] generate error:",



        err,



      );







      setError(



        err instanceof Error



          ? err.message



          : "Unable to generate voice.",



      );



    } finally {



      setGenerating(false);



    }



  };







  // ============================================================



  // UPLOAD



  // ============================================================







  const handleUploadVoice = async (



    event: ChangeEvent<HTMLInputElement>,



  ) => {



    const file =



      event.target.files?.[0];







    if (!file) return;







    try {



      setUploading(true);







      setError("");







      const response =



        await uploadVoice(file);







      console.log(



        "[VITERBOX] upload:",



        response,



      );







      await loadVoices();







      if (



        response.voice?.filename



      ) {



        setSelectedVoice(



          response.voice.filename,



        );



      }



    } catch (err) {



      setError(



        err instanceof Error



          ? err.message



          : "Unable to upload voice.",



      );



    } finally {



      setUploading(false);







      if (



        fileInputRef.current



      ) {



        fileInputRef.current.value =



          "";



      }



    }



  };







  // ============================================================



  // DOWNLOAD RESULT



  // ============================================================







  const handleDownloadResult =



    async () => {



      if (!result?.audio_url) return;







      try {



        setDownloading(true);







        setError("");







        await downloadAudioFile(



          result.audio_url,



          result.filename ||



          "generated.wav",



        );



      } catch (err) {



        setError(



          err instanceof Error



            ? err.message



            : "Unable to download audio.",



        );



      } finally {



        setDownloading(false);



      }



    };







  // ============================================================



  // DOWNLOAD REFERENCE VOICE



  // ============================================================







  const handleDownloadVoice =



    async () => {



      if (!selectedVoiceData)



        return;







      try {



        setDownloading(true);







        setError("");







        await downloadAudioFile(



          getVoiceAudioUrl(



            selectedVoiceData,



          ),



          selectedVoiceData.filename,



        );



      } catch (err) {



        setError(



          err instanceof Error



            ? err.message



            : "Unable to download voice.",



        );



      } finally {



        setDownloading(false);



      }



    };







  if (!authReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
          <span className="text-xs font-semibold">Loading Creator AI...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        mode={authMode}
        loading={authLoading}
        error={authError}
        onModeChange={(mode) => {
          setAuthMode(mode);
          setAuthError("");
        }}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );
  }

  return (



    <div className="min-h-dvh bg-slate-100 text-slate-950">



      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-[#f8fafc] shadow-xl">







        {/* HEADER */}







        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur-xl">



          <div className="flex items-center gap-2.5">



            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">



              <SparklesIcon />



            </div>







            <div>



              <div className="text-sm font-bold tracking-tight">



                Creator AI



              </div>







              <div className="text-[10px] font-medium text-slate-400">



                AI Content Studio



              </div>



            </div>



          </div>







          <div



            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-semibold ${apiConnected



              ? "bg-emerald-50 text-emerald-700"



              : "bg-slate-100 text-slate-500"



              }`}



          >



            <span



              className={`h-1.5 w-1.5 rounded-full ${apiConnected



                ? "bg-emerald-500"



                : "bg-slate-400"



                }`}



            />







            {apiConnected



              ? "Connected"



              : "Offline"}



          </div>



        </header>







        <main className="flex-1 px-5 pb-32 pt-6">



          {activeTab === "home" && (

            <>







              {/* HERO */}







              <section>



                <p className="text-sm font-medium text-indigo-600">



                  Create with AI



                </p>







                <h1 className="mt-1 max-w-[320px] text-[28px] font-bold leading-[1.15] tracking-[-0.035em]">



                  Turn your text into natural voice.



                </h1>







                <p className="mt-2 text-sm leading-6 text-slate-500">



                  Create high-quality AI



                  voiceovers using Viterbox.



                </p>



              </section>







              {/* GENERATOR */}







              <section className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">



                <div className="p-4">







                  <div className="mb-3 flex items-center justify-between">



                    <div>



                      <h2 className="text-sm font-semibold">



                        What do you want to say?



                      </h2>







                      <p className="mt-0.5 text-xs text-slate-400">



                        Enter your voiceover text



                      </p>



                    </div>







                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">



                      <MicIcon />



                    </div>



                  </div>







                  {/* TEXT */}







                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50">



                    <textarea



                      value={text}



                      onChange={(event) =>



                        setText(



                          event.target.value.slice(



                            0,



                            5000,



                          ),



                        )



                      }



                      placeholder="Example: Bạn đang học Swift nhưng mãi không tiến bộ?"



                      rows={6}



                      maxLength={5000}



                      className="w-full resize-none bg-transparent text-sm leading-6 outline-none placeholder:text-slate-400"



                    />







                    <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">



                      <span className="text-[10px] text-slate-400">



                        {text.length.toLocaleString()}



                        /5,000



                      </span>







                      <button



                        type="button"



                        onClick={() =>



                          setText(



                            "Bạn đang học Swift nhưng mãi không tiến bộ? Hôm nay chúng ta sẽ cùng tìm hiểu năm sai lầm phổ biến nhất khi học Swift.",



                          )



                        }



                        className="text-[11px] font-semibold text-indigo-600"



                      >



                        Try example



                      </button>



                    </div>



                  </div>







                  {/* SETTINGS */}







                  <div className="mt-4 grid grid-cols-2 gap-2">







                    <div>



                      <label className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wider text-slate-400">



                        Language



                      </label>







                      <div className="relative">



                        <select



                          value={language}



                          onChange={(e) =>



                            setLanguage(



                              e.target.value,



                            )



                          }



                          className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-8 text-xs font-semibold outline-none"



                        >



                          {LANGUAGES.map(



                            (item) => (



                              <option



                                key={item.value}



                                value={item.value}



                              >



                                {item.label}



                              </option>



                            ),



                          )}



                        </select>







                        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">



                          <ChevronDownIcon />



                        </div>



                      </div>



                    </div>







                    <div>



                      <label className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wider text-slate-400">



                        Voice



                      </label>







                      <div className="relative">



                        <select



                          value={selectedVoice}



                          onChange={(e) =>



                            setSelectedVoice(



                              e.target.value,



                            )



                          }



                          disabled={



                            loadingVoices ||



                            !voices.length



                          }



                          className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-8 text-xs font-semibold outline-none disabled:bg-slate-50"



                        >



                          {loadingVoices && (



                            <option>



                              Loading...



                            </option>



                          )}







                          {!loadingVoices &&



                            !voices.length && (



                              <option>



                                No voice



                              </option>



                            )}







                          {voices.map(



                            (voice) => (



                              <option



                                key={voice.id}



                                value={



                                  voice.filename



                                }



                              >



                                {voice.name}



                              </option>



                            ),



                          )}



                        </select>







                        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">



                          <ChevronDownIcon />



                        </div>



                      </div>



                    </div>



                  </div>







                  {/* SELECTED VOICE */}







                  {selectedVoiceData && (



                    <div className="mt-3 rounded-2xl bg-slate-50 p-3">







                      <div className="flex items-center gap-3">



                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">



                          <MicIcon className="h-4 w-4" />



                        </div>







                        <div className="min-w-0 flex-1">



                          <p className="truncate text-xs font-semibold">



                            {



                              selectedVoiceData.name



                            }



                          </p>







                          <p className="text-[10px] text-slate-400">



                            Reference voice ·{" "}



                            {formatDuration(



                              selectedVoiceData.duration,



                            )}



                          </p>



                        </div>



                      </div>







                      <div className="mt-3">



                        {loadingPreview ? (



                          <div className="flex h-10 items-center justify-center">



                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />



                          </div>



                        ) : voicePreviewUrl ? (



                          <audio



                            key={



                              voicePreviewUrl



                            }



                            controls



                            preload="metadata"



                            src={



                              voicePreviewUrl



                            }



                            className="w-full"



                          />



                        ) : (



                          <div className="rounded-xl bg-rose-50 p-2 text-center text-[10px] text-rose-600">



                            Audio unavailable



                          </div>



                        )}



                      </div>







                      <button



                        type="button"



                        onClick={



                          handleDownloadVoice



                        }



                        disabled={downloading}



                        className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-[11px] font-semibold"



                      >



                        <DownloadIcon />







                        Download reference voice



                      </button>



                    </div>



                  )}







                  {/* UPLOAD */}







                  <button



                    type="button"



                    onClick={() =>



                      fileInputRef.current?.click()



                    }



                    disabled={uploading}



                    className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs font-semibold text-slate-600"



                  >



                    {uploading ? (



                      <>



                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />



                        Uploading voice...



                      </>



                    ) : (



                      <>



                        <UploadIcon className="h-4 w-4" />



                        Add reference voice



                      </>



                    )}



                  </button>







                  <input



                    ref={fileInputRef}



                    type="file"



                    accept=".wav,.mp3,.m4a,.flac,audio/*"



                    onChange={



                      handleUploadVoice



                    }



                    className="hidden"



                  />







                  {/* ADVANCED */}







                  <div className="mt-4 border-t border-slate-100 pt-4">



                    <button



                      type="button"



                      onClick={() =>



                        setShowAdvanced(



                          (value) => !value,



                        )



                      }



                      className="flex w-full items-center justify-between"



                    >



                      <div className="flex items-center gap-2.5">



                        <SettingsIcon />







                        <div className="text-left">



                          <p className="text-xs font-semibold">



                            Advanced settings



                          </p>







                          <p className="text-[10px] text-slate-400">



                            Customize voice



                            generation



                          </p>



                        </div>



                      </div>







                      <ChevronDownIcon />



                    </button>







                    {showAdvanced && (



                      <div className="mt-4 space-y-5 rounded-2xl bg-slate-50 p-4">



                        <RangeSetting



                          label="Exaggeration"



                          description="Voice expressiveness"



                          value={exaggeration}



                          min={0}



                          max={2}



                          step={0.1}



                          onChange={



                            setExaggeration



                          }



                        />







                        <RangeSetting



                          label="CFG weight"



                          description="Voice guidance strength"



                          value={cfgWeight}



                          min={0}



                          max={1}



                          step={0.05}



                          onChange={



                            setCfgWeight



                          }



                        />







                        <RangeSetting



                          label="Temperature"



                          description="Generation variation"



                          value={temperature}



                          min={0.1}



                          max={1}



                          step={0.05}



                          onChange={



                            setTemperature



                          }



                        />







                        <RangeSetting



                          label="Sentence pause"



                          description="Pause between sentences"



                          value={sentencePause}



                          min={0}



                          max={2000}



                          step={100}



                          suffix=" ms"



                          onChange={



                            setSentencePause



                          }



                        />



                      </div>



                    )}



                  </div>







                  {/* ERROR */}







                  {error && (



                    <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-700">



                      {error}



                    </div>



                  )}







                  {/* GENERATE */}







                  <button



                    type="button"



                    onClick={handleGenerate}



                    disabled={



                      !text.trim() ||



                      generating ||



                      loadingVoices ||



                      !selectedVoice



                    }



                    className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:bg-slate-300"



                  >



                    {generating ? (



                      <>



                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />



                        Generating voice...



                      </>



                    ) : (



                      <>



                        <SparklesIcon className="h-4 w-4" />



                        Generate Voice



                      </>



                    )}



                  </button>







                  <p className="mt-2 text-center text-[10px] text-slate-400">



                    Powered by Viterbox



                  </p>



                </div>



              </section>







              {/* GENERATED RESULT */}







              {result && (



                <section className="mt-5 overflow-hidden rounded-[24px] border border-emerald-100 bg-white shadow-sm">



                  <div className="p-4">







                    <div className="flex items-center justify-between">



                      <div className="flex items-center gap-2.5">



                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">



                          <CheckIcon />



                        </div>







                        <div>



                          <h2 className="text-sm font-bold">



                            Voice generated



                          </h2>







                          <p className="text-[10px] text-slate-400">



                            Your audio is ready



                          </p>



                        </div>



                      </div>







                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">



                        Ready



                      </span>



                    </div>







                    <div className="mt-4 rounded-2xl bg-slate-50 p-3">



                      {resultAudioUrl ? (



                        <audio



                          key={



                            resultAudioUrl



                          }



                          controls



                          autoPlay



                          preload="metadata"



                          src={



                            resultAudioUrl



                          }



                          className="w-full"



                        />



                      ) : (



                        <div className="py-3 text-center text-xs text-slate-400">



                          Loading audio...



                        </div>



                      )}



                    </div>







                    <div className="mt-3 grid grid-cols-3 gap-2">



                      <InfoBox



                        title="Duration"



                        value={formatDuration(



                          result.duration,



                        )}



                      />







                      <InfoBox



                        title="Language"



                        value={



                          result.language?.toUpperCase() ||



                          "-"



                        }



                      />







                      <InfoBox



                        title="Characters"



                        value={String(



                          result.text_length ??



                          text.length,



                        )}



                      />



                    </div>







                    <button



                      type="button"



                      onClick={



                        handleDownloadResult



                      }



                      disabled={



                        downloading ||



                        !result.audio_url



                      }



                      className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold disabled:opacity-50"



                    >



                      {downloading ? (



                        <>



                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />



                          Downloading...



                        </>



                      ) : (



                        <>



                          <DownloadIcon />



                          Download audio



                        </>



                      )}



                    </button>



                  </div>



                </section>



              )}







              {/* VOICE LIBRARY */}







              <section className="mt-7">



                <div className="mb-3 flex items-center justify-between">



                  <div>



                    <h2 className="text-sm font-bold">



                      Voice library



                    </h2>







                    <p className="text-[11px] text-slate-400">



                      {voices.length} voices



                      available



                    </p>



                  </div>







                  <button



                    type="button"



                    onClick={() =>



                      fileInputRef.current?.click()



                    }



                    className="text-xs font-semibold text-indigo-600"



                  >



                    \+ Add voice



                  </button>



                </div>







                <div className="space-y-2">



                  {voices.map((voice) => {



                    const active =



                      voice.filename ===



                      selectedVoice;







                    return (



                      <button



                        key={voice.id}



                        type="button"



                        onClick={() =>



                          setSelectedVoice(



                            voice.filename,



                          )



                        }



                        className={`flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-left shadow-sm ${active



                          ? "border-indigo-300 ring-2 ring-indigo-50"



                          : "border-slate-200"



                          }`}



                      >



                        <div



                          className={`flex h-10 w-10 items-center justify-center rounded-full ${active



                            ? "bg-indigo-600 text-white"



                            : "bg-indigo-50 text-indigo-600"



                            }`}



                        >



                          <MicIcon className="h-4 w-4" />



                        </div>







                        <div className="min-w-0 flex-1">



                          <p className="truncate text-sm font-semibold">



                            {voice.name}



                          </p>







                          <p className="truncate text-[10px] text-slate-400">



                            {voice.filename} ·{" "}



                            {formatDuration(



                              voice.duration,



                            )}



                          </p>



                        </div>







                        {active && (



                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">



                            <CheckIcon />



                          </div>



                        )}



                      </button>



                    );



                  })}



                </div>



              </section>



            </>

          )}



          {activeTab === "create" && (
            <CreationStudio
              onOpenTextToVoice={() => setActiveTab("home")}
              onVideoGenerated={(video) => {
                setActiveTab("videos");
                void loadGeneratedVideos();
              }}
            />
          )}

          {activeTab === "voices" && (

            <GeneratedVoicesTab

              voices={generatedVoices}

              loading={loadingGeneratedVoices}

              onCreateVideo={(voice) => setVideoVoice(voice)}

            />

          )}

          {activeTab === "videos" && (
            <GeneratedVideosTab
              videos={generatedVideos}
              loading={loadingGeneratedVideos}
            />
          )}

          {activeTab === "profile" && <ProfileTab user={currentUser} onLogout={handleLogout} />}

        </main>







        {/* BOTTOM NAV */}







        <nav className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-md -translate-x-1/2 items-center justify-around border-t border-slate-200 bg-white/95 px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">

          <button type="button" onClick={() => setActiveTab("home")} className={`flex min-w-16 flex-col items-center gap-1 transition ${activeTab === "home" ? "text-indigo-600" : "text-slate-400"}`}>

            <HomeIcon /><span className="text-[10px] font-semibold">Home</span>

          </button>

          <button type="button" onClick={() => { setActiveTab("voices"); void loadGeneratedVoices(); }} className={`flex min-w-16 flex-col items-center gap-1 transition ${activeTab === "voices" ? "text-indigo-600" : "text-slate-400"}`}>

            <MicIcon /><span className="text-[10px] font-semibold">Voices</span>

          </button>

          <button type="button" onClick={() => setActiveTab("create")} className="-mt-7 flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-[#f8fafc] bg-slate-950 text-white shadow-lg transition active:scale-95" aria-label="Create new content">

            <PlusIcon className="h-6 w-6" />

          </button>

          <button type="button" onClick={() => { setActiveTab("videos"); void loadGeneratedVideos(); }} className={`flex min-w-16 flex-col items-center gap-1 transition ${activeTab === "videos" ? "text-indigo-600" : "text-slate-400"}`}>

            <VideoIcon /><span className="text-[10px] font-semibold">Videos</span>

          </button>

          <button type="button" onClick={() => setActiveTab("profile")} className={`flex min-w-16 flex-col items-center gap-1 transition ${activeTab === "profile" ? "text-indigo-600" : "text-slate-400"}`}>

            <UserIcon /><span className="text-[10px] font-semibold">Profile</span>

          </button>

        </nav>



        {videoVoice && (

          <CreateVideoModal
            voice={videoVoice}
            onClose={() => setVideoVoice(null)}
            onGenerated={() => {
              setVideoVoice(null);
              setActiveTab("videos");
              void loadGeneratedVideos();
            }}
          />

        )}



      </div>



    </div>



  );



}







// ============================================================



function GeneratedVoicesTab({

  voices,

  loading,

  onCreateVideo,

}: {

  voices: GeneratedVoice[];

  loading: boolean;

  onCreateVideo: (voice: GeneratedVoice) => void;

}) {

  const [downloadingId, setDownloadingId] = useState("");

  const [downloadError, setDownloadError] = useState("");



  const handleDownload = async (voice: GeneratedVoice) => {

    try {

      setDownloadingId(voice.id);

      setDownloadError("");

      await downloadAudioFile(

        voice.audio_url,

        voice.filename || "generated.wav",

      );

    } catch (err) {

      setDownloadError(

        err instanceof Error ? err.message : "Unable to download audio.",

      );

    } finally {

      setDownloadingId("");

    }

  };



  return (

    <section>

      <div className="mb-5">

        <p className="text-sm font-medium text-indigo-600">Library</p>

        <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.035em]">

          Generated voices

        </h1>

        <p className="mt-2 text-sm text-slate-500">

          {voices.length} generated {voices.length === 1 ? "voice" : "voices"}

        </p>

      </div>



      {downloadError && (

        <div className="mb-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">

          {downloadError}

        </div>

      )}



      {loading ? (

        <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-12 text-center">

          <span className="mx-auto block h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />

          <p className="mt-3 text-xs font-medium text-slate-500">

            Loading generated voices...

          </p>

        </div>

      ) : !voices.length ? (

        <div className="rounded-[24px] border border-dashed border-slate-200 bg-white px-5 py-12 text-center">

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">

            <MicIcon />

          </div>

          <h2 className="mt-4 text-sm font-bold">No generated voices</h2>

          <p className="mx-auto mt-1 max-w-[250px] text-xs leading-5 text-slate-400">

            Generate your first voice from the Home tab. Generated audio will appear here.

          </p>

        </div>

      ) : (

        <div className="space-y-3">

          {voices.map((voice) => (

            <article

              key={voice.id}

              className="overflow-hidden rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"

            >

              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">

                  <MicIcon className="h-4 w-4" />

                </div>

                <div className="min-w-0 flex-1">

                  <p className="truncate text-sm font-semibold">{voice.filename}</p>

                  <p className="mt-1 text-[10px] text-slate-400">

                    {formatDuration(voice.duration)} · {voice.language?.toUpperCase() || "-"} · {voice.text_length || 0} chars

                  </p>

                </div>

                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">

                  Ready

                </span>

              </div>



              {voice.text && (

                <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">

                  {voice.text}

                </p>

              )}



              <div className="mt-3 rounded-2xl bg-slate-50 p-2">

                <audio

                  controls

                  preload="metadata"

                  src={absoluteApiUrl(voice.audio_url)}

                  className="w-full"

                />

              </div>



              <div className="mt-3 grid grid-cols-2 gap-2">

                <button

                  type="button"

                  disabled={downloadingId === voice.id}

                  onClick={() => void handleDownload(voice)}

                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-[11px] font-semibold disabled:opacity-50"

                >

                  {downloadingId === voice.id ? (

                    <>

                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />

                      Downloading...

                    </>

                  ) : (

                    <>

                      <DownloadIcon />

                      Download

                    </>

                  )}

                </button>



                <button

                  type="button"

                  onClick={() => onCreateVideo(voice)}

                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 text-[11px] font-semibold text-white shadow-sm transition active:scale-[0.98]"

                >

                  <VideoIcon className="h-4 w-4" />

                  Create video

                </button>

              </div>

            </article>

          ))}

        </div>

      )}

    </section>

  );

}




function CreationStudio({
  onVideoGenerated,
  onOpenTextToVoice,
}: {
  onVideoGenerated: (video: GeneratedVideo) => void;
  onOpenTextToVoice: () => void;
}) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [creationType, setCreationType] = useState<CreationType>("text_to_video");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("3d_cartoon");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [duration, setDuration] = useState(4);
  const [images, setImages] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [generatedImage, setGeneratedImage] = useState<RunwayImageResponse | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<RunwayVideoResponse | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  console.log('generatedVideo', generatedVideo)
  const requiresImages =
    creationType === "image_to_video" ||
    creationType === "image_to_image" ||
    creationType === "video_reference_to_video";
  const requiresVideo =
    creationType === "video_to_video" ||
    creationType === "video_reference_to_video";
  const isImageOutput =
    creationType === "text_to_image" || creationType === "image_to_image";

  useEffect(() => {
    const previews = images.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  const canCreate =
    creationType === "text_to_voice"
      ? !creating
      : prompt.trim().length > 0 &&
      (!requiresImages || images.length > 0) &&
      (!requiresVideo || !!videoFile) &&
      !creating;

  const handleCreate = async () => {
    if (creationType === "text_to_voice") {
      onOpenTextToVoice();
      return;
    }

    if (!canCreate) return;

    try {
      setCreating(true);
      setCreateError("");
      setGeneratedImage(null);
      setGeneratedVideo(null);

      if (creationType === "text_to_video") {
        const result = await generateTextToVideo({
          prompt: prompt.trim(),
          style,
          aspectRatio,
          duration,
        });
        setGeneratedVideo(result);
        onVideoGenerated({
          id: result.id || result.filename,
          filename: result.filename,
          video_url: result.video_url,
          duration: result.duration,
          created_at: result.created_at || new Date().toISOString(),
        });
        return;
      }

      if (creationType === "image_to_video") {
        const result = await generateImageToVideo({
          images,
          prompt: prompt.trim(),
          style,
          aspectRatio,
          duration,
        });
        setGeneratedVideo(result);
        onVideoGenerated({
          id: result.id || result.filename,
          filename: result.filename,
          video_url: result.video_url,
          duration: result.duration,
          created_at: result.created_at || new Date().toISOString(),
        });
        return;
      }

      if (creationType === "video_reference_to_video" && videoFile) {
        const result = await generateVideoToVideo({
          video: videoFile,
          images,
          prompt: prompt.trim(),
          style,
          aspectRatio,
        });
        setGeneratedVideo(result);
        onVideoGenerated({
          id: result.id || result.filename,
          filename: result.filename,
          video_url: result.video_url,
          duration: result.duration,
          created_at: result.created_at || new Date().toISOString(),
        });
        return;
      }

      if (creationType === "video_to_video" && videoFile) {
        const result = await generateVideoToVideo({
          video: videoFile,
          prompt: prompt.trim(),
          style,
          aspectRatio,
        });
        setGeneratedVideo(result);
        onVideoGenerated({
          id: result.id || result.filename,
          filename: result.filename,
          video_url: result.video_url,
          duration: result.duration,
          created_at: result.created_at || new Date().toISOString(),
        });
        return;
      }

      if (creationType === "text_to_image") {
        setGeneratedImage(
          await generateTextToImage({
            prompt: prompt.trim(),
            style,
            aspectRatio,
          }),
        );
        return;
      }

      if (creationType === "image_to_image") {
        setGeneratedImage(
          await generateImageToImage({
            images,
            prompt: prompt.trim(),
            style,
            aspectRatio,
          }),
        );
      }
    } catch (err) {
      console.error("[CREATE] error:", err);
      setCreateError(err instanceof Error ? err.message : "Unable to generate content.");
    } finally {
      setCreating(false);
    }
  };

  const modes: Array<{
    value: CreationType;
    title: string;
    description: string;
    provider: string;
  }> = [
      { value: "text_to_voice", title: "Text → Voice", description: "Create natural voice audio from text.", provider: "Viterbox" },
      { value: "text_to_video", title: "Text → Video", description: "Generate a video directly from your prompt.", provider: "Runway" },
      { value: "image_to_video", title: "Image → Video", description: "Animate one or multiple reference images.", provider: "Runway" },
      { value: "video_to_video", title: "Video → Video", description: "Transform an existing video with a prompt.", provider: "Runway" },
      { value: "video_reference_to_video", title: "Video + Images → Video", description: "Transform a video using additional reference images.", provider: "Runway" },
      { value: "text_to_image", title: "Text → Image", description: "Generate an image from text.", provider: "Runway" },
      { value: "image_to_image", title: "Image → Image", description: "Generate a new image from references and text.", provider: "Runway" },
    ];

  return (
    <section>
      <div className="mb-5">
        <p className="text-sm font-medium text-indigo-600">AI Studio</p>
        <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.035em]">
          What do you want to create?
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Choose a generation type, then configure the input below.
        </p>
      </div>

      <div className="-mx-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {modes.map((mode) => {
          const active = creationType === mode.value;

          const icon =
            mode.value === "text_to_voice" ? (
              <MicIcon className="h-6 w-6" />
            ) : mode.value === "text_to_image" || mode.value === "image_to_image" ? (
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            ) : (
              <VideoIcon className="h-6 w-6" />
            );

          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => {
                setCreationType(mode.value);
                setCreateError("");
                setGeneratedImage(null);
                setGeneratedVideo(null);
              }}
              className={`group flex min-h-[88px] w-full items-center gap-4 rounded-2xl border p-2 text-left transition-all ${active
                ? "border-indigo-500 bg-[#17191d] shadow-[0_0_0_2px_rgba(99,102,241,0.18)]"
                : "border-[#22252a] bg-[#121416] hover:border-[#343840] hover:bg-[#15171a]"
                }`}
            >
              <div
                className={`flex h-[68px] w-[72px] shrink-0 items-center justify-center rounded-xl border transition ${active
                  ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                  : "border-[#24282e] bg-[#1b1e22] text-slate-200"
                  }`}
              >
                {icon}
              </div>

              <div className="min-w-0 flex-1 pr-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-[13px] font-medium text-white">
                    {mode.title}
                  </p>

                  {active && (
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white">
                      <CheckIcon />
                    </span>
                  )}
                </div>

                <p className="mt-1 text-[11px] font-medium text-slate-400">
                  {mode.provider}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        {creationType === "text_to_voice" ? (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                <MicIcon />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Text → Voice</p>
                <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                  Voice generation continues to use your existing Viterbox flow.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenTextToVoice}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-xs font-bold text-white"
            >
              <MicIcon className="h-4 w-4" />
              Open Viterbox Voice Creator
            </button>
          </div>
        ) : (
          <>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value.slice(0, 5000))}
              rows={5}
              placeholder={
                isImageOutput
                  ? "Describe the image you want to generate..."
                  : "Describe the scene, movement, camera and visual direction..."
              }
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            />

            {requiresImages && creationType !== "video_reference_to_video" && (
              <div className="mt-4">
                <input
                  ref={imageInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => setImages(Array.from(event.target.files || []).slice(0, 30))}
                />

                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">Reference images</p>
                    <p className="text-[10px] text-slate-400">Select one or multiple images.</p>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">{images.length}/30</span>
                </div>

                {imagePreviews.length ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {imagePreviews.map((preview, index) => (
                        <div key={preview} className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                          <img src={preview} alt={`Reference ${index + 1}`} className="aspect-square w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setImages((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/75 text-xs text-white"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-[11px] font-semibold text-slate-600"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add / replace images
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex aspect-video w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-500"
                  >
                    <UploadIcon className="h-6 w-6" />
                    <span className="mt-2 text-xs font-semibold">Upload reference images</span>
                    <span className="mt-1 text-[10px] text-slate-400">PNG, JPG, WEBP</span>
                  </button>
                )}
              </div>
            )}

            {requiresVideo && (
              <div className="mt-4">
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  className="hidden"
                  onChange={(event) => setVideoFile(event.target.files?.[0] || null)}
                />
                <div className="mb-2">
                  <p className="text-xs font-semibold">Source video</p>
                  <p className="text-[10px] text-slate-400">Upload the video you want Runway to transform.</p>
                </div>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="flex min-h-24 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-500"
                >
                  <VideoIcon className="h-6 w-6" />
                  <span className="mt-2 max-w-[280px] truncate px-4 text-xs font-semibold">
                    {videoFile?.name || "Upload source video"}
                  </span>
                  <span className="mt-1 text-[10px] text-slate-400">MP4, MOV or WEBM</span>
                </button>

                {creationType === "video_reference_to_video" && (
                  <div className="mt-3">
                    <input
                      ref={imageInputRef}
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) => setImages(Array.from(event.target.files || []).slice(0, 30))}
                    />
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-[11px] font-semibold text-slate-600"
                    >
                      <UploadIcon className="h-4 w-4" />
                      Select reference images ({images.length}/30)
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Style
                </label>
                <select
                  value={style}
                  onChange={(event) => setStyle(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none"
                >
                  <option value="3d_cartoon">3D Cartoon</option>
                  <option value="anime">Anime</option>
                  <option value="cinematic">Cinematic</option>
                  <option value="comic">Comic</option>
                  <option value="">Default</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Aspect ratio
                </label>
                <select
                  value={aspectRatio}
                  onChange={(event) => setAspectRatio(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none"
                >
                  <option value="9:16">9:16 · Portrait</option>
                  <option value="16:9">16:9 · Landscape</option>
                  <option value="1:1">1:1 · Square</option>
                </select>
              </div>
            </div>

            {(creationType === "text_to_video" || creationType === "image_to_video") && (
              <div className="mt-4">
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Duration
                </label>
                <select
                  value={duration}
                  onChange={(event) => setDuration(Number(event.target.value))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none"
                >
                  <option value={4}>4 seconds</option>
                  <option value={6}>6 seconds</option>
                  <option value={8}>8 seconds</option>
                </select>
              </div>
            )}
          </>
        )}

        {createError && (
          <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-xs leading-5 text-rose-700">
            {createError}
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={!canCreate}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {creating ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Generating...
            </>
          ) : (
            <>
              <SparklesIcon className="h-4 w-4" />
              {creationType === "text_to_voice"
                ? "Open Voice Creator"
                : isImageOutput
                  ? "Generate image"
                  : "Generate video"}
            </>
          )}
        </button>

        <p className="mt-2 text-center text-[10px] text-slate-400">
          {creationType === "text_to_voice" ? "Powered by Viterbox" : "Powered by Runway"}
        </p>
      </div>

      {generatedImage && (
        <div className="mt-5 overflow-hidden rounded-[24px] border border-emerald-100 bg-white shadow-sm">
          <img
            src={absoluteApiUrl(generatedImage.image_url)}
            alt={generatedImage.filename}
            className="w-full bg-slate-100 object-cover"
          />
          <div className="p-4">
            <p className="truncate text-sm font-bold">{generatedImage.filename}</p>
            <p className="mt-1 text-[10px] text-emerald-600">Image generated successfully</p>
          </div>
        </div>
      )}

      {generatedVideo && (
        <div className="mt-5 overflow-hidden rounded-[24px] border border-emerald-100 bg-white shadow-sm">
          <AuthVideo
            src={generatedVideo.video_url}
            autoPlay
            className="aspect-video w-full bg-slate-950 object-contain"
          />
          <div className="p-4">
            <p className="truncate text-sm font-bold">{generatedVideo.filename}</p>
            <p className="mt-1 text-[10px] text-emerald-600">Video generated successfully</p>
          </div>
        </div>
      )}
    </section>
  );
}


function CreateVideoModal({
  voice,
  onClose,
  onGenerated,
}: {
  voice: GeneratedVoice;
  onClose: () => void;
  onGenerated: (video: GeneratedVideo) => void;
}) {

  const imageInputRef = useRef<HTMLInputElement>(null);

  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [prompt, setPrompt] = useState("");

  const [style, setStyle] = useState("3d_cartoon");

  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoError, setVideoError] = useState("");

  const handleCreateVideo = async () => {
    if (!imageFiles.length || generatingVideo) return;
    try {
      setGeneratingVideo(true);
      setVideoError("");
      const response = await generateVideo({
        voiceUrl: voice.audio_url,
        images: imageFiles,
        prompt: prompt.trim(),
        style,
        aspectRatio,
      });
      console.log("[VIDEO] generate response:", response);
      onGenerated({
        id: response.id,
        filename: response.filename,
        video_url: response.video_url,
        duration: response.duration,
        created_at: response.created_at,
      });
    } catch (err) {
      console.error("[VIDEO] generate error:", err);
      setVideoError(err instanceof Error ? err.message : "Unable to generate video.");
    } finally {
      setGeneratingVideo(false);
    }
  };



  useEffect(() => {
    const previews = imageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);

    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);


  return (

    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">

      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur-xl">

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-600">

              AI Video

            </p>

            <h2 className="mt-0.5 text-lg font-bold">Create video</h2>

          </div>

          <button

            type="button"

            onClick={onClose}

            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-500"

            aria-label="Close create video"

          >

            ×

          </button>

        </div>



        <div className="space-y-5 p-5">

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm">

                <MicIcon className="h-4 w-4" />

              </div>

              <div className="min-w-0 flex-1">

                <p className="truncate text-xs font-semibold text-slate-800">

                  {voice.filename}

                </p>

                <p className="mt-0.5 text-[10px] text-slate-500">

                  {formatDuration(voice.duration)} · {voice.language?.toUpperCase() || "VOICE"}

                </p>

              </div>

              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-semibold text-emerald-700">

                Selected

              </span>

            </div>

            <audio

              controls

              preload="metadata"

              src={absoluteApiUrl(voice.audio_url)}

              className="mt-3 w-full"

            />

          </div>



          <div>

            <div className="mb-2 flex items-center justify-between">

              <div>

                <p className="text-xs font-semibold">Character / image</p>

                <p className="mt-0.5 text-[10px] text-slate-400">

                  Upload the character or scene image to animate.

                </p>

              </div>

            </div>



            <input
              ref={imageInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) =>
                setImageFiles(Array.from(event.target.files || []).slice(0, 30))
              }
            />

            {imagePreviews.length ? (
              <div>
                <div className="grid grid-cols-3 gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={preview} className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      <img src={preview} alt={`Reference ${index + 1}`} className="aspect-square w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageFiles((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/75 text-xs text-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-[11px] font-semibold text-slate-600"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add / replace reference images ({imageFiles.length}/30)
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex aspect-video w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-500"
              >
                <UploadIcon className="h-6 w-6" />
                <span className="mt-2 text-xs font-semibold">Upload reference images</span>
                <span className="mt-1 text-[10px] text-slate-400">PNG, JPG or WEBP · up to 30 images</span>
              </button>
            )}
          </div>

          <div>

            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">

              Animation prompt

            </label>

            <textarea

              value={prompt}

              onChange={(event) => setPrompt(event.target.value.slice(0, 1000))}

              rows={3}

              placeholder="Example: The character walks through a magical forest, cinematic camera movement..."

              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"

            />

          </div>



          <div className="grid grid-cols-2 gap-3">

            <div>

              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">

                Style

              </label>

              <select

                value={style}

                onChange={(event) => setStyle(event.target.value)}

                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none"

              >

                <option value="3d_cartoon">3D Cartoon</option>

                <option value="anime">Anime</option>

                <option value="cinematic">Cinematic</option>

                <option value="comic">Comic</option>

              </select>

            </div>



            <div>

              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">

                Aspect ratio

              </label>

              <select

                value={aspectRatio}

                onChange={(event) => setAspectRatio(event.target.value)}

                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none"

              >

                <option value="9:16">9:16 · Shorts</option>

                <option value="16:9">16:9 · Landscape</option>

                <option value="1:1">1:1 · Square</option>

              </select>

            </div>

          </div>



          {videoError && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-[10px] leading-5 text-rose-700">
              {videoError}
            </div>
          )}



          <button
            type="button"
            onClick={() => void handleCreateVideo()}
            disabled={!imageFiles.length || generatingVideo}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-bold text-white shadow-lg transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            title={!imageFiles.length ? "Upload at least one image first" : "Generate video"}
          >
            {generatingVideo ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Generating video...
              </>
            ) : (
              <>
                <VideoIcon className="h-5 w-5" />
                Create video
              </>
            )}
          </button>

        </div>

      </div>

    </div>

  );

}



function GeneratedVideosTab({
  videos,
  loading,
}: {
  videos: GeneratedVideo[];
  loading: boolean;
}) {

  return (

    <section>

      <div className="mb-5"><p className="text-sm font-medium text-indigo-600">Library</p><h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.035em]">Generated videos</h1><p className="mt-2 text-sm text-slate-500">{videos.length} generated {videos.length === 1 ? "video" : "videos"}</p></div>

      {loading ? (

        <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-12 text-center">
          <span className="mx-auto block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
          <p className="mt-3 text-xs text-slate-400">Loading generated videos...</p>
        </div>

      ) : !videos.length ? (

        <div className="rounded-[24px] border border-dashed border-slate-200 bg-white px-5 py-12 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><VideoIcon /></div><h2 className="mt-4 text-sm font-bold">No generated videos</h2><p className="mx-auto mt-1 max-w-[250px] text-xs leading-5 text-slate-400">Generated videos from /api/videos will appear here.</p></div>

      ) : (

        <div className="space-y-4">{videos.map((video) => (

          <article key={video.id} className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
            <AuthVideo
              src={video.video_url}
              poster={video.thumbnail_url}
              className="aspect-video w-full bg-slate-950 object-contain"
            />
            <div className="p-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><VideoIcon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{video.filename}</p><p className="mt-0.5 text-[10px] text-slate-400">{video.duration ? formatDuration(video.duration) : "Generated video"}</p></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">Ready</span>
            </div>
            </div>
          </article>

        ))}</div>

      )}

    </section>

  );

}



function ProfileTab({
  user,
  onLogout,
}: {
  user: AuthUser;
  onLogout: () => void;
}) {
  const displayName =
    user.full_name?.trim() ||
    user.name?.trim() ||
    user.email?.split("@")[0] ||
    "Creator";

  return (
    <section>
      <div className="mb-5">
        <p className="text-sm font-medium text-indigo-600">Account</p>
        <h1 className="mt-1 text-[28px] font-bold tracking-[-0.035em]">
          Profile
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage your Creator AI account.
        </p>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
              <UserIcon />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-slate-950">
                {displayName}
              </h2>
              <p className="mt-1 truncate text-xs text-slate-500">
                {user.email}
              </p>
              <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-bold text-emerald-700">
                Signed in
              </span>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Email
            </p>
            <p className="mt-1 break-all text-xs font-semibold text-slate-700">
              {user.email}
            </p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="mt-4 flex h-11 w-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 transition hover:bg-rose-100 active:scale-[0.99]"
          >
            Sign out
          </button>
        </div>
      </div>
    </section>
  );
}



// INFO BOX



// ============================================================








function AuthScreen({
  mode,
  loading,
  error,
  onModeChange,
  onLogin,
  onRegister,
}: {
  mode: AuthMode;
  loading: boolean;
  error: string;
  onModeChange: (mode: AuthMode) => void;
  onLogin: (payload: { email: string; password: string }) => Promise<void>;
  onRegister: (payload: {
    full_name: string;
    email: string;
    password: string;
  }) => Promise<void>;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const isRegister = mode === "register";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError("");

    const normalizedEmail = email.trim();

    if (isRegister && !fullName.trim()) {
      setLocalError("Please enter your name.");
      return;
    }

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setLocalError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setLocalError("Password must contain at least 6 characters.");
      return;
    }

    try {
      if (isRegister) {
        await onRegister({
          full_name: fullName.trim(),
          email: normalizedEmail,
          password,
        });
      } else {
        await onLogin({
          email: normalizedEmail,
          password,
        });
      }
    } catch {
      // Parent already exposes the API error.
    }
  };

  return (
    <div className="min-h-dvh bg-slate-100 px-4 py-8 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300">
            <SparklesIcon className="h-6 w-6" />
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-[-0.035em]">
            Creator AI
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            AI voice, image and video studio
          </p>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <div className="p-5">
            <div className="rounded-2xl bg-slate-100 p-1">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onModeChange("login");
                    setLocalError("");
                  }}
                  className={`h-10 rounded-xl text-xs font-bold transition ${mode === "login"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500"
                    }`}
                >
                  Sign in
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onModeChange("register");
                    setLocalError("");
                  }}
                  className={`h-10 rounded-xl text-xs font-bold transition ${mode === "register"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500"
                    }`}
                >
                  Create account
                </button>
              </div>
            </div>

            <div className="mt-5">
              <h2 className="text-xl font-bold tracking-tight">
                {isRegister ? "Create your account" : "Welcome back"}
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {isRegister
                  ? "Create an account to save your generation history."
                  : "Sign in to continue creating and access your history."}
              </p>
            </div>

            <form onSubmit={submit} className="mt-5 space-y-3">
              {isRegister && (
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Full name
                  </label>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    autoComplete="name"
                    placeholder="Your name"
                    disabled={loading}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 disabled:opacity-60"
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  disabled={loading}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 disabled:opacity-60"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Password
                  </label>
                  {!isRegister && (
                    <span className="text-[10px] font-semibold text-slate-400">
                      Minimum 6 characters
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={isRegister ? "new-password" : "current-password"}
                    placeholder="••••••••"
                    disabled={loading}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-16 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-[10px] font-bold text-indigo-600"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {(localError || error) && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-700">
                  {localError || error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white shadow-lg transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {isRegister ? "Creating account..." : "Signing in..."}
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4" />
                    {isRegister ? "Create account" : "Sign in"}
                  </>
                )}
              </button>
            </form>

            <p className="mt-5 text-center text-[10px] leading-5 text-slate-400">
              Your generated media history is linked to your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


function InfoBox({



  title,



  value,



}: {



  title: string;



  value: string;



}) {



  return (



    <div className="rounded-xl border border-slate-100 p-2.5">



      <span className="block text-[8px] font-medium uppercase tracking-wider text-slate-400">



        {title}



      </span>







      <span className="mt-1 block truncate text-xs font-semibold text-slate-800">



        {value}



      </span>



    </div>



  );



}