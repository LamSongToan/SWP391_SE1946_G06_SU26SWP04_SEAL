import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid2,
  LinearProgress,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { authStorage, http, resolveAssetUrl } from "../../api/http";
import { brand } from "../../styles/designTokens";

const USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;
const PROFILE_DRAFT_STORAGE_KEY = "seal-profile-draft";
const AVATAR_EDITOR_SIZE = 280;
const AVATAR_MAX_FILE_SIZE = 5 * 1024 * 1024;
const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const EMPTY_FORM = {
  username: "",
  fullName: "",
  avatarUrl: "",
  bio: "",
  profileLinks: "",
  studentType: "",
  studentCode: "",
  universityName: "",
};

const MAX_PROFILE_LINKS = 5;
const SOCIAL_LINK_PRESETS = ["Facebook", "GitHub", "LinkedIn", "Portfolio"];

function parseProfileLinks(value, options = {}) {
  const keepEmpty = Boolean(options.keepEmpty);
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        label: String(item.label || "").trim(),
        url: String(item.url || "").trim(),
      }))
      .filter((item) => keepEmpty || item.label || item.url)
      .slice(0, MAX_PROFILE_LINKS);
  }

  try {
    const parsed = JSON.parse(value);
    return parseProfileLinks(parsed, options);
  } catch {
    return [];
  }
}

function serializeProfileLinks(links, options = {}) {
  const normalized = parseProfileLinks(links, options);
  return normalized.length ? JSON.stringify(normalized) : "";
}

function normalizeProfileLinkUrl(url) {
  const trimmedUrl = String(url || "").trim();
  if (!trimmedUrl) return "";
  if (/^https?:\/\//i.test(trimmedUrl)) {
    return trimmedUrl;
  }
  return `https://${trimmedUrl}`;
}

function normalizeProfileLinksForStorage(value) {
  const normalized = parseProfileLinks(value)
    .map((link) => ({
      label: link.label.trim(),
      url: normalizeProfileLinkUrl(link.url),
    }))
    .filter((link) => link.label || link.url);

  return normalized.length ? JSON.stringify(normalized) : "";
}

function readProfileDraft() {
  try {
    const raw = sessionStorage.getItem(PROFILE_DRAFT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearProfileDraft() {
  sessionStorage.removeItem(PROFILE_DRAFT_STORAGE_KEY);
}

function toFormFromProfile(profile) {
  return {
    username: profile?.username || "",
    fullName: profile?.fullName || "",
    avatarUrl: profile?.avatarUrl || "",
    bio: profile?.bio || "",
    profileLinks: profile?.profileLinks || "",
    studentType: profile?.studentType || "",
    studentCode: profile?.studentCode || "",
    universityName: profile?.universityName || "",
  };
}

function getProfileInitials(profile = {}) {
  const source = (profile?.fullName || profile?.username || "U").trim();
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }
  const compact = source.replace(/[^a-zA-Z0-9]/g, "");
  return (compact.slice(0, 2) || "U").toUpperCase();
}

function withAssetVersion(url, version) {
  if (!url || !version) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${version}`;
}

function formatProfileDateTime(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatActionLabel(value) {
  if (!value) return "Activity";
  return String(value)
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(" ");
}

function formatActivityTarget(item) {
  if (item?.targetName) return item.targetName;
  if (item?.targetEntity) return item.targetEntity;
  if (item?.targetId) return `ID ${item.targetId}`;
  return "SEAL workspace";
}

function getProfileLinkLabel(link) {
  if (link?.label?.trim()) return link.label.trim();
  try {
    return new URL(link.url).hostname.replace(/^www\./, "");
  } catch {
    return "Profile link";
  }
}

function getProfileLinkDomain(link) {
  try {
    return new URL(normalizeProfileLinkUrl(link.url)).hostname.replace(/^www\./, "");
  } catch {
    return normalizeProfileLinkUrl(link.url);
  }
}

function isValidProfileUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function validateProfileLinks(value) {
  const links = parseProfileLinks(value);
  if (links.length > MAX_PROFILE_LINKS) return `Add ${MAX_PROFILE_LINKS} links or fewer`;
  const serialized = normalizeProfileLinksForStorage(links);
  if (serialized.length > 2000) return "Profile links are too long";

  for (const link of links) {
    const normalizedUrl = normalizeProfileLinkUrl(link.url);
    if (!normalizedUrl) return "Each link needs a URL";
    if (link.label.length > 40) return "Link labels must be 40 characters or fewer";
    if (normalizedUrl.length > 300) return "Each link URL must be 300 characters or fewer";
    if (!isValidProfileUrl(normalizedUrl)) return "Enter a valid social link or website URL";
  }

  return "";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getAvatarMinScale(width, height) {
  return Math.max(AVATAR_EDITOR_SIZE / width, AVATAR_EDITOR_SIZE / height);
}

function clampAvatarOffset(offset, width, height, scale) {
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const maxX = Math.max((scaledWidth - AVATAR_EDITOR_SIZE) / 2, 0);
  const maxY = Math.max((scaledHeight - AVATAR_EDITOR_SIZE) / 2, 0);

  return {
    x: clamp(offset.x, -maxX, maxX),
    y: clamp(offset.y, -maxY, maxY),
  };
}

async function createCroppedAvatarBlob(imageElement, cropState) {
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_EDITOR_SIZE;
  canvas.height = AVATAR_EDITOR_SIZE;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to prepare avatar preview");
  }

  const { width, height, scale, offset } = cropState;
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const left = AVATAR_EDITOR_SIZE / 2 - scaledWidth / 2 + offset.x;
  const top = AVATAR_EDITOR_SIZE / 2 - scaledHeight / 2 + offset.y;

  const sourceX = (0 - left) / scale;
  const sourceY = (0 - top) / scale;
  const sourceWidth = AVATAR_EDITOR_SIZE / scale;
  const sourceHeight = AVATAR_EDITOR_SIZE / scale;

  context.drawImage(
    imageElement,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    AVATAR_EDITOR_SIZE,
    AVATAR_EDITOR_SIZE
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Unable to prepare avatar file"));
      }
    }, "image/png");
  });
}

function syncStoredAuthProfile(profile) {
  if (!profile) return;
  const auth = authStorage.get();
  if (!auth) return;

  authStorage.set({
    ...auth,
    username: profile.username ?? auth.username,
    fullName: profile.fullName ?? auth.fullName,
    avatarUrl: profile.avatarUrl ?? auth.avatarUrl,
  });
}

function ProfileSectionHeader({ title, description, action = null }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", sm: "center" }}
      spacing={1.2}
      sx={{ mb: 1.8 }}
    >
      <Box>
        <Typography sx={{ color: brand.colors.text, fontSize: 20, fontWeight: 950, lineHeight: 1.2 }}>
          {title}
        </Typography>
        {description ? (
          <Typography sx={{ color: brand.colors.muted, fontSize: 13.5, mt: 0.45 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {action}
    </Stack>
  );
}

function ProfileInfoPill({ icon, label, value }) {
  return (
    <Stack
      direction="row"
      spacing={1.1}
      alignItems="center"
      sx={{
        minWidth: 0,
        p: 1.35,
        borderRadius: brand.radius.md,
        bgcolor: "#FFFFFF",
        border: `1px solid ${brand.colors.line}`,
      }}
    >
      <Box sx={{ color: brand.colors.orange, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: brand.colors.muted, fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.45 }}>
          {label}
        </Typography>
        <Typography sx={{ color: brand.colors.text, fontSize: 13.5, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || "N/A"}
        </Typography>
      </Box>
    </Stack>
  );
}

function ProfileLinkButton({ link }) {
  return (
    <Button
      component="a"
      href={normalizeProfileLinkUrl(link.url)}
      target="_blank"
      rel="noreferrer"
      sx={{
        justifyContent: "flex-start",
        width: { xs: "100%", sm: "auto" },
        minWidth: { xs: "100%", sm: 210 },
        maxWidth: { xs: "100%", sm: 260 },
        borderRadius: brand.radius.md,
        px: 1.25,
        py: 1,
        color: brand.colors.navy,
        border: `1px solid ${brand.colors.line}`,
        bgcolor: "#FFFFFF",
        textTransform: "none",
        boxShadow: "0 8px 22px rgba(7, 26, 47, 0.06)",
        "&:hover": {
          borderColor: "#FDBA74",
          bgcolor: brand.colors.surfaceWarm,
          boxShadow: "0 12px 28px rgba(243, 112, 33, 0.13)",
        },
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%", minWidth: 0 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 2,
            bgcolor: brand.colors.surfaceWarm,
            color: brand.colors.orange,
            display: "grid",
            placeItems: "center",
            flex: "0 0 34px",
          }}
        >
          <LinkRoundedIcon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1, textAlign: "left" }}>
          <Typography sx={{ color: brand.colors.text, fontSize: 13.5, fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {getProfileLinkLabel(link)}
          </Typography>
          <Typography sx={{ color: brand.colors.muted, fontSize: 12, fontWeight: 750, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {getProfileLinkDomain(link)}
          </Typography>
        </Box>
        <OpenInNewRoundedIcon sx={{ fontSize: 17, color: brand.colors.muted, flex: "0 0 auto" }} />
      </Stack>
    </Button>
  );
}

function ProfileStatTile({ icon, label, value, tone = "orange" }) {
  const colors = {
    orange: { bg: brand.colors.surfaceWarm, color: brand.colors.orange },
    blue: { bg: "#EFF6FF", color: "#2563EB" },
    green: { bg: "#ECFDF5", color: "#059669" },
  };
  const selected = colors[tone] || colors.orange;
  return (
    <Box
      sx={{
        minHeight: 112,
        p: 2,
        border: `1px solid ${brand.colors.line}`,
        borderRadius: brand.radius.md,
        bgcolor: "#FFFFFF",
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: brand.colors.muted, fontSize: 12, fontWeight: 900 }}>
            {label}
          </Typography>
          <Typography sx={{ color: brand.colors.text, fontSize: typeof value === "number" ? 26 : 19, fontWeight: 950, lineHeight: 1.15, mt: 0.8, wordBreak: "break-word" }}>
            {value}
          </Typography>
        </Box>
        <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: selected.bg, color: selected.color, display: "grid", placeItems: "center", flex: "0 0 42px" }}>
          {icon}
        </Box>
      </Stack>
    </Box>
  );
}

function CapabilityItem({ title, description, icon }) {
  return (
    <Box
      sx={{
        p: 1.7,
        borderRadius: brand.radius.md,
        border: `1px solid ${brand.colors.line}`,
        bgcolor: "#FFFFFF",
      }}
    >
      <Stack direction="row" spacing={1.3} alignItems="flex-start">
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: 2,
            bgcolor: brand.colors.surfaceWarm,
            color: brand.colors.orange,
            display: "grid",
            placeItems: "center",
            flex: "0 0 38px",
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: brand.colors.text, fontWeight: 900, lineHeight: 1.25 }}>
            {title}
          </Typography>
          <Typography sx={{ color: brand.colors.muted, fontSize: 13.5, mt: 0.45, lineHeight: 1.55 }}>
            {description}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

function ActivityItem({ item }) {
  return (
    <Box sx={{ position: "relative", pl: 3.4, pb: 1.35, "&:not(:last-child)::before": { content: '""', position: "absolute", left: 9, top: 22, bottom: -2, width: 2, bgcolor: "#E2E8F0" } }}>
      <Box sx={{ position: "absolute", left: 0, top: 4, width: 20, height: 20, borderRadius: "50%", bgcolor: brand.colors.surfaceWarm, border: "3px solid #FFFFFF", boxShadow: "0 0 0 1px #E2E8F0" }} />
      <Box sx={{ p: 1.65, borderRadius: brand.radius.md, border: `1px solid ${brand.colors.line}`, bgcolor: "#FFFFFF" }}>
        <Typography sx={{ color: brand.colors.text, fontSize: 15, fontWeight: 900 }}>
          {formatActionLabel(item.actionType)}
        </Typography>
        <Typography sx={{ color: brand.colors.muted, fontSize: 13.5, mt: 0.4 }}>
          {formatActivityTarget(item)} - {formatProfileDateTime(item.timestamp)}
        </Typography>
      </Box>
    </Box>
  );
}

export default function UserProfilePanel({ onDirtyChange = () => {} }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef(null);
  const avatarImageRef = useRef(null);
  const avatarDragRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [teams, setTeams] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarDialogError, setAvatarDialogError] = useState("");
  const [avatarDialogMode, setAvatarDialogMode] = useState("current");
  const [avatarEditorFile, setAvatarEditorFile] = useState(null);
  const [avatarEditorUrl, setAvatarEditorUrl] = useState("");
  const [avatarEditorScale, setAvatarEditorScale] = useState(1);
  const [avatarEditorMinScale, setAvatarEditorMinScale] = useState(1);
  const [avatarEditorOffset, setAvatarEditorOffset] = useState({ x: 0, y: 0 });
  const [avatarEditorImageSize, setAvatarEditorImageSize] = useState({ width: 0, height: 0 });
  const [roleCapabilitiesOpen, setRoleCapabilitiesOpen] = useState(false);
  const editMode = searchParams.get("mode") === "edit";

  const isStudent = useMemo(() => profile?.roles?.includes("STUDENT"), [profile]);
  const roleHighlights = useMemo(() => {
    const roles = profile?.roles || [];
    const items = [];

    if (roles.includes("COORDINATOR")) {
      items.push({
        title: "Coordinator Workspace",
        description: "Manage approvals, events, tracks, and round configuration for SEAL semesters.",
      });
    }
    if (roles.includes("MENTOR")) {
      items.push({
        title: "Mentor Participation",
        description: "Support teams in assigned tracks and monitor their progress through each stage.",
      });
    }
    if (roles.includes("JUDGE")) {
      items.push({
        title: "Judge Access",
        description: "Review submissions and record scores when evaluation rounds are assigned.",
      });
    }
    if (roles.includes("STUDENT")) {
      items.push({
        title: "Student Participation",
        description: "Join events, form teams, and participate in submission and round workflows.",
      });
    }

    return items;
  }, [profile?.roles]);
  const roleCapabilities = useMemo(() => {
    const roles = profile?.roles || [];
    const items = [];

    if (roles.includes("COORDINATOR")) {
      items.push(
        {
          title: "Event configuration",
          description: "Create semester events, configure tracks, rounds, deadlines, scoring criteria, and awards.",
          icon: <EventRoundedIcon fontSize="small" />,
        },
        {
          title: "User and role operations",
          description: "Review participant accounts, manage active users, guest judges, and role-based access.",
          icon: <BadgeRoundedIcon fontSize="small" />,
        },
        {
          title: "Audit and assignments",
          description: "Track audited changes and coordinate judge or mentor assignments for active rounds.",
          icon: <CalendarTodayRoundedIcon fontSize="small" />,
        }
      );
    }
    if (roles.includes("MENTOR")) {
      items.push({
        title: "Mentor workspace",
        description: "View assigned tracks, follow team progress, and leave feedback for mentored submissions.",
        icon: <GroupsRoundedIcon fontSize="small" />,
      });
    }
    if (roles.includes("JUDGE")) {
      items.push({
        title: "Judging workspace",
        description: "Review assigned submissions, inspect repository links, and finalize rubric scores.",
        icon: <EditRoundedIcon fontSize="small" />,
      });
    }
    if (roles.includes("STUDENT")) {
      items.push({
        title: "Team participation",
        description: "Join teams, track current events, and submit work during open rounds.",
        icon: <GroupsRoundedIcon fontSize="small" />,
      });
    }

    return items;
  }, [profile?.roles]);
  const uniqueEvents = useMemo(
    () => Array.from(new Map((teams || []).map((team) => [team.eventId, team])).values()),
    [teams]
  );
  const displayProfile = editMode
    ? {
        fullName: form.fullName,
        username: form.username,
        avatarUrl: form.avatarUrl,
        bio: form.bio,
        profileLinks: form.profileLinks,
        studentType: form.studentType,
        studentCode: form.studentCode,
        universityName: form.universityName,
      }
    : {
        fullName: profile?.fullName || "",
        username: profile?.username || "",
        avatarUrl: profile?.avatarUrl || "",
        bio: profile?.bio || "",
        profileLinks: profile?.profileLinks || "",
        studentType: profile?.studentType || "",
        studentCode: profile?.studentCode || "",
        universityName: profile?.universityName || "",
      };
  const editableProfileLinks = useMemo(() => parseProfileLinks(form.profileLinks, { keepEmpty: true }), [form.profileLinks]);
  const visibleProfileLinks = useMemo(() => parseProfileLinks(displayProfile.profileLinks), [displayProfile.profileLinks]);
  const displayAvatarSrc = withAssetVersion(
    resolveAssetUrl(displayProfile.avatarUrl),
    profile?.__avatarVersion
  );

  const resetAvatarEditorState = () => {
    setAvatarDialogError("");
    setAvatarDialogMode("current");
    setAvatarEditorFile(null);
    setAvatarEditorScale(1);
    setAvatarEditorMinScale(1);
    setAvatarEditorOffset({ x: 0, y: 0 });
    setAvatarEditorImageSize({ width: 0, height: 0 });
    setAvatarEditorUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      return "";
    });
  };

  const openAvatarDialog = () => {
    resetAvatarEditorState();
    setAvatarDialogOpen(true);
  };

  const closeAvatarDialog = () => {
    if (uploadingAvatar) return;
    setAvatarDialogOpen(false);
    resetAvatarEditorState();
  };

  const emitProfileUpdated = (data) => {
    window.dispatchEvent(new CustomEvent("seal-profile-updated", { detail: data }));
  };

  const applyProfileData = (data, message = "", options = {}) => {
    const shouldBustAvatar = options.bustAvatar && data?.avatarUrl;
    const shouldPreserveAvatarVersion = profile?.__avatarVersion && data?.avatarUrl === profile?.avatarUrl;
    const nextData = data
      ? {
          ...data,
          __avatarVersion: shouldBustAvatar
            ? Date.now()
            : shouldPreserveAvatarVersion
              ? profile.__avatarVersion
              : data.__avatarVersion,
        }
      : data;

    setProfile(nextData);
    setForm(toFormFromProfile(nextData));
    syncStoredAuthProfile(nextData);
    emitProfileUpdated(nextData);
    if (message) {
      setSuccess(message);
    }
  };

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const profileResponse = await http.get("/api/users/me");
      const profileData = profileResponse.data?.data || null;
      applyProfileData(profileData);

      if (profileData?.roles?.includes("STUDENT")) {
        try {
          const teamsResponse = await http.get("/api/teams/my");
          setTeams(teamsResponse.data?.data || []);
        } catch {
          setTeams([]);
        }
      } else {
        setTeams([]);
      }

      if (profileData?.roles?.includes("COORDINATOR")) {
        try {
          const activityResponse = await http.get("/api/coordinator/scoring/audit-logs");
          setRecentActivity((activityResponse.data?.data || []).slice(0, 5));
        } catch {
          setRecentActivity([]);
        }
      } else {
        setRecentActivity([]);
      }

      setFieldErrors({});
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const validateField = (name, value) => {
    const trimmedValue = typeof value === "string" ? value.trim() : value;

    switch (name) {
      case "username":
        if (!trimmedValue) return "Username is required";
        if (trimmedValue.length < 4 || trimmedValue.length > 50) {
          return "Username must be 4-50 characters";
        }
        if (!USERNAME_REGEX.test(trimmedValue)) {
          return "Username only allows letters, numbers, dot, underscore and hyphen";
        }
        return "";
      case "fullName":
        if (!trimmedValue) return "Full name is required";
        if (trimmedValue.length > 150) return "Full name must be 150 characters or fewer";
        return "";
      case "bio":
        if (trimmedValue.length > 500) return "Bio must be 500 characters or fewer";
        return "";
      case "profileLinks":
        return validateProfileLinks(value);
      default:
        return "";
    }
  };

  const collectClientErrors = (nextForm = form) => ({
    username: validateField("username", nextForm.username),
    fullName: validateField("fullName", nextForm.fullName),
    bio: validateField("bio", nextForm.bio),
    profileLinks: validateField("profileLinks", nextForm.profileLinks),
  });

  const hasClientErrors = Object.values(collectClientErrors()).some(Boolean);
  const isSaveDisabled = saving || uploadingAvatar || hasClientErrors;
  const profileDirty = useMemo(() => {
    if (!profile) return false;
    return JSON.stringify({
      username: form.username.trim(),
      fullName: form.fullName.trim(),
      avatarUrl: form.avatarUrl || "",
      bio: form.bio || "",
      profileLinks: normalizeProfileLinksForStorage(form.profileLinks),
    }) !== JSON.stringify({
      username: profile.username || "",
      fullName: profile.fullName || "",
      avatarUrl: profile.avatarUrl || "",
      bio: profile.bio || "",
      profileLinks: normalizeProfileLinksForStorage(profile.profileLinks),
    });
  }, [form.avatarUrl, form.bio, form.fullName, form.profileLinks, form.username, profile]);

  useEffect(() => {
    if (!profile?.email) return;
    const savedDraft = readProfileDraft();
    if (savedDraft?.owner !== profile.email || !savedDraft?.form) return;
    setForm((prev) => ({
      ...prev,
      ...savedDraft.form,
      studentType: profile.studentType || prev.studentType || "",
      studentCode: profile.studentCode || prev.studentCode || "",
      universityName: profile.universityName || prev.universityName || "",
    }));
  }, [profile?.email, profile?.studentCode, profile?.studentType, profile?.universityName]);

  useEffect(() => {
    if (editMode || !profile) return;
    const savedDraft = readProfileDraft();
    if (savedDraft?.owner === profile.email) return;
    setForm(toFormFromProfile(profile));
    setTouched({});
    setFieldErrors({});
  }, [editMode, profile]);

  useEffect(() => {
    const isDirty = editMode && profileDirty;
    onDirtyChange(isDirty);
    if (!profile?.email) return;

    if (editMode && profileDirty) {
      sessionStorage.setItem(
        PROFILE_DRAFT_STORAGE_KEY,
        JSON.stringify({
          owner: profile.email,
          form: {
            username: form.username,
            fullName: form.fullName,
            avatarUrl: form.avatarUrl,
            bio: form.bio,
            profileLinks: form.profileLinks,
          },
        })
      );
    } else if (editMode && !profileDirty) {
      clearProfileDraft();
    }
  }, [editMode, form.avatarUrl, form.bio, form.fullName, form.profileLinks, form.username, onDirtyChange, profile?.email, profileDirty]);

  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  useEffect(() => {
    return () => {
      if (avatarEditorUrl) {
        URL.revokeObjectURL(avatarEditorUrl);
      }
    };
  }, [avatarEditorUrl]);

  useEffect(() => {
    const handleDiscardDraft = () => {
      clearProfileDraft();
      setTouched({});
      setFieldErrors({});
      setError("");
      setSuccess("");
      if (profile) {
        setForm(toFormFromProfile(profile));
      } else {
        setForm(EMPTY_FORM);
      }
    };

    window.addEventListener("seal-discard-profile-draft", handleDiscardDraft);
    return () => window.removeEventListener("seal-discard-profile-draft", handleDiscardDraft);
  }, [profile]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!(editMode && profileDirty)) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [editMode, profileDirty]);

  const onChange = (key) => (event) => {
    const rawValue = event.target.value;
    const value = key === "username" ? rawValue.trimStart() : rawValue;

    setForm((prev) => {
      const nextForm = { ...prev, [key]: value };
      const nextTouched = { ...touched, [key]: true };
      const clientErrors = collectClientErrors(nextForm);
      const mergedErrors = { ...fieldErrors };

      Object.keys(clientErrors).forEach((fieldName) => {
        if (nextTouched[fieldName]) {
          mergedErrors[fieldName] = clientErrors[fieldName];
        }
      });

      setTouched(nextTouched);
      setFieldErrors(mergedErrors);
      return nextForm;
    });
  };

  const setProfileLinksValue = (nextLinks) => {
    setForm((prev) => {
      const nextForm = { ...prev, profileLinks: serializeProfileLinks(nextLinks, { keepEmpty: true }) };
      setTouched((prevTouched) => ({ ...prevTouched, profileLinks: true }));
      setFieldErrors((prevErrors) => ({
        ...prevErrors,
        profileLinks: validateField("profileLinks", nextForm.profileLinks),
      }));
      return nextForm;
    });
  };

  const onProfileLinkChange = (index, key) => (event) => {
    const nextLinks = [...editableProfileLinks];
    nextLinks[index] = {
      ...nextLinks[index],
      [key]: event.target.value,
    };
    setProfileLinksValue(nextLinks);
  };

  const addProfileLink = (label = "") => {
    if (editableProfileLinks.length >= MAX_PROFILE_LINKS) return;
    setProfileLinksValue([...editableProfileLinks, { label, url: "" }]);
  };

  const removeProfileLink = (index) => {
    setProfileLinksValue(editableProfileLinks.filter((_, itemIndex) => itemIndex !== index));
  };

  const getFieldErrors = (err) => {
    const response = err?.response?.data;
    const message = response?.message || "";
    const validationData = response?.data;

    if (validationData && typeof validationData === "object" && !Array.isArray(validationData)) {
      return validationData;
    }

    if (message.includes("Username already exists")) {
      return { username: message };
    }

    return {};
  };

  const cancelEdit = () => {
    clearProfileDraft();
    setSearchParams({ section: "account" });
    setTouched({});
    setFieldErrors({});
    if (profile) {
      setForm(toFormFromProfile(profile));
    }
  };

  const openEditProfile = () => {
    setSearchParams({ section: "account", mode: "edit" });
    setSuccess("");
    setError("");
  };

  const onSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    const allTouched = { username: true, fullName: true, bio: true, profileLinks: true };
    const clientErrors = collectClientErrors(form);
    setTouched(allTouched);
    setFieldErrors(clientErrors);
    if (Object.values(clientErrors).some(Boolean)) {
      setSaving(false);
      return;
    }

    try {
      const payload = {
        username: form.username,
        fullName: form.fullName,
        avatarUrl: form.avatarUrl,
        bio: form.bio,
        profileLinks: normalizeProfileLinksForStorage(form.profileLinks),
        studentType: null,
        studentCode: null,
        universityName: null,
      };
      const response = await http.put("/api/users/me", payload);
      const responseProfile = response.data?.data || profile || {};
      const responseHasProfileLinks = Object.prototype.hasOwnProperty.call(responseProfile, "profileLinks");
      const nextProfile = {
        ...responseProfile,
        profileLinks:
          responseHasProfileLinks && (responseProfile.profileLinks || !payload.profileLinks)
            ? responseProfile.profileLinks
            : payload.profileLinks,
      };
      applyProfileData(nextProfile, "Profile updated successfully");
      clearProfileDraft();
      setSearchParams({ section: "account" });
    } catch (err) {
      const nextFieldErrors = getFieldErrors(err);
      setFieldErrors(nextFieldErrors);
      if (Object.keys(nextFieldErrors).length === 0) {
        setError(err?.response?.data?.message || "Failed to update profile");
      }
    } finally {
      setSaving(false);
    }
  };

  const onChooseAvatarFileClick = () => {
    fileInputRef.current?.click();
  };

  const onAvatarFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
      setAvatarDialogError("Avatar image must be JPG, PNG, WEBP, or GIF");
      return;
    }
    if (file.size > AVATAR_MAX_FILE_SIZE) {
      setAvatarDialogError("Avatar image must be 5 MB or smaller");
      return;
    }

    setAvatarDialogError("");
    setAvatarDialogMode("replace");
    setAvatarEditorFile(file);
    setAvatarEditorImageSize({ width: 0, height: 0 });
    setAvatarEditorScale(1);
    setAvatarEditorMinScale(1);
    setAvatarEditorOffset({ x: 0, y: 0 });

    const nextPreviewUrl = URL.createObjectURL(file);
    setAvatarEditorUrl((currentPreviewUrl) => {
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
      }
      return nextPreviewUrl;
    });
  };

  const onRemoveAvatar = () => {
    setAvatarDialogError("");
    setAvatarDialogMode("remove");
  };

  const onAvatarPreviewImageLoad = (event) => {
    const image = event.currentTarget;
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    const minScale = getAvatarMinScale(width, height);

    setAvatarEditorImageSize({ width, height });
    setAvatarEditorMinScale(minScale);
    setAvatarEditorScale(minScale);
    setAvatarEditorOffset({ x: 0, y: 0 });
  };

  const onAvatarScaleChange = (_, nextValue) => {
    const nextScale = Array.isArray(nextValue) ? nextValue[0] : nextValue;
    setAvatarEditorScale(nextScale);
    setAvatarEditorOffset((currentOffset) =>
      clampAvatarOffset(currentOffset, avatarEditorImageSize.width, avatarEditorImageSize.height, nextScale)
    );
  };

  const onAvatarDragStart = (event) => {
    if (avatarDialogMode !== "replace" || !avatarEditorUrl) return;
    avatarDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: avatarEditorOffset.x,
      originY: avatarEditorOffset.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onAvatarDragMove = (event) => {
    if (!avatarDragRef.current || avatarDragRef.current.pointerId !== event.pointerId) return;

    const nextOffset = clampAvatarOffset(
      {
        x: avatarDragRef.current.originX + (event.clientX - avatarDragRef.current.startX),
        y: avatarDragRef.current.originY + (event.clientY - avatarDragRef.current.startY),
      },
      avatarEditorImageSize.width,
      avatarEditorImageSize.height,
      avatarEditorScale
    );

    setAvatarEditorOffset(nextOffset);
  };

  const onAvatarDragEnd = (event) => {
    if (avatarDragRef.current?.pointerId === event.pointerId) {
      avatarDragRef.current = null;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };

  const onConfirmAvatarUpdate = async () => {
    setUploadingAvatar(true);
    setError("");
    setSuccess("");
    try {
      if (avatarDialogMode === "remove") {
        const response = await http.delete("/api/users/me/avatar");
        applyProfileData(response.data?.data, "Avatar removed successfully");
      } else {
        if (!avatarEditorFile || !avatarImageRef.current) {
          setAvatarDialogError("Choose an image before updating your avatar");
          setUploadingAvatar(false);
          return;
        }

        const croppedBlob = await createCroppedAvatarBlob(avatarImageRef.current, {
          width: avatarEditorImageSize.width,
          height: avatarEditorImageSize.height,
          scale: avatarEditorScale,
          offset: avatarEditorOffset,
        });

        const formData = new FormData();
        formData.append("file", new File([croppedBlob], "avatar.png", { type: "image/png" }));

        const response = await http.post("/api/users/me/avatar", formData);
        const freshProfileResponse = await http.get("/api/users/me");
        const persistedProfile = freshProfileResponse.data?.data || response.data?.data;
        if (!persistedProfile?.avatarUrl) {
          throw new Error("Backend did not persist the avatar URL");
        }
        applyProfileData(persistedProfile, "Avatar updated successfully", { bustAvatar: true });
      }

      setAvatarDialogOpen(false);
      resetAvatarEditorState();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          (avatarDialogMode === "remove" ? "Failed to remove avatar" : "Failed to update avatar")
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  const hasStoredAvatar = Boolean(profile?.avatarUrl);
  const avatarActionPending =
    avatarDialogMode === "replace"
      ? Boolean(avatarEditorFile)
      : avatarDialogMode === "remove"
        ? hasStoredAvatar
        : false;

  const editProfileContent = (
    <Box>
        <ProfileSectionHeader
          title="Edit Profile"
          description="Update how your account appears across SEAL workspaces."
          action={(
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="text" color="inherit" startIcon={<CloseRoundedIcon />} onClick={cancelEdit}>
              Cancel
            </Button>
            <Button variant="contained" startIcon={<EditRoundedIcon />} onClick={onSave} disabled={isSaveDisabled}>
              {saving ? "Saving..." : "Save profile"}
            </Button>
          </Stack>
          )}
        />

        <Grid2 container spacing={2.2}>
          <Grid2 size={{ xs: 12, md: 6 }}>
            <TextField
              label="Username"
              value={form.username}
              onChange={onChange("username")}
              error={Boolean(fieldErrors.username)}
              helperText={fieldErrors.username || "4-50 characters. Letters, numbers, dot, underscore, and hyphen only."}
              fullWidth
            />
          </Grid2>
          <Grid2 size={{ xs: 12, md: 6 }}>
            <TextField label="Email" value={profile?.email || ""} fullWidth disabled />
          </Grid2>
          <Grid2 size={{ xs: 12, md: 6 }}>
            <TextField
              label="Full Name"
              value={form.fullName}
              onChange={onChange("fullName")}
              error={Boolean(fieldErrors.fullName)}
              helperText={fieldErrors.fullName || " "}
              fullWidth
            />
          </Grid2>
          <Grid2 size={{ xs: 12, md: 6 }}>
            <TextField label="Status" value={profile?.status || ""} fullWidth disabled />
          </Grid2>
          <Grid2 size={{ xs: 12 }}>
            <TextField
              label="Bio"
              value={form.bio}
              onChange={onChange("bio")}
              error={Boolean(fieldErrors.bio)}
              helperText={fieldErrors.bio || `${form.bio.length}/500 characters`}
              fullWidth
              multiline
              minRows={4}
            />
          </Grid2>
          <Grid2 size={{ xs: 12 }}>
            <Box
              sx={{
                p: 1.7,
                borderRadius: brand.radius.md,
                border: `1px solid ${fieldErrors.profileLinks ? brand.colors.danger : brand.colors.line}`,
                bgcolor: "#F8FAFC",
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.2}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                sx={{ mb: editableProfileLinks.length ? 1.4 : 0 }}
              >
                <Box>
                  <Typography sx={{ color: brand.colors.text, fontSize: 15, fontWeight: 950 }}>
                    Social links
                  </Typography>
                  <Typography sx={{ color: brand.colors.muted, fontSize: 12.5, mt: 0.35 }}>
                    Add public links such as Facebook, GitHub, LinkedIn, or a personal site. You can type facebook.com/name without https.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddRoundedIcon />}
                  onClick={() => addProfileLink()}
                  disabled={editableProfileLinks.length >= MAX_PROFILE_LINKS}
                  sx={{ borderRadius: 999, textTransform: "none", fontWeight: 850 }}
                >
                  Add link
                </Button>
              </Stack>

              {editableProfileLinks.length ? (
                <Stack spacing={1.1}>
                  {editableProfileLinks.map((link, index) => (
                    <Stack
                      key={`profile-link-${index}`}
                      direction={{ xs: "column", md: "row" }}
                      spacing={1}
                      alignItems={{ xs: "stretch", md: "flex-start" }}
                    >
                      <TextField
                        label="Label"
                        value={link.label}
                        onChange={onProfileLinkChange(index, "label")}
                        placeholder="Facebook"
                        sx={{ flex: { xs: "1 1 auto", md: "0 0 220px" } }}
                      />
                      <TextField
                        label="URL"
                        value={link.url}
                        onChange={onProfileLinkChange(index, "url")}
                        placeholder="facebook.com/username"
                        sx={{ flex: "1 1 auto" }}
                      />
                      <Button
                        variant="text"
                        color="inherit"
                        onClick={() => removeProfileLink(index)}
                        startIcon={<DeleteOutlineRoundedIcon />}
                        sx={{
                          minHeight: 54,
                          alignSelf: { xs: "stretch", md: "center" },
                          color: brand.colors.muted,
                          textTransform: "none",
                          fontWeight: 850,
                        }}
                      >
                        Remove
                      </Button>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography sx={{ color: brand.colors.muted, fontSize: 13, mt: 1.1 }}>
                  No links yet. Add one so people can find your external profile or portfolio.
                </Typography>
              )}

              <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap sx={{ mt: 1.2 }}>
                {SOCIAL_LINK_PRESETS.map((preset) => (
                  <Button
                    key={preset}
                    variant="text"
                    size="small"
                    startIcon={<AddRoundedIcon />}
                    onClick={() => addProfileLink(preset)}
                    disabled={editableProfileLinks.length >= MAX_PROFILE_LINKS}
                    sx={{ borderRadius: 999, textTransform: "none", fontWeight: 850 }}
                  >
                    {preset}
                  </Button>
                ))}
              </Stack>

              <Typography sx={{ color: fieldErrors.profileLinks ? brand.colors.danger : brand.colors.muted, fontSize: 12.5, mt: 1 }}>
                {fieldErrors.profileLinks || `${parseProfileLinks(form.profileLinks).length}/${MAX_PROFILE_LINKS} links. URLs like facebook.com/name are accepted.`}
              </Typography>
            </Box>
          </Grid2>
          {isStudent ? (
            <>
              <Grid2 size={{ xs: 12, md: 4 }}>
                <TextField label="Student Type" value={form.studentType} fullWidth disabled />
              </Grid2>
              <Grid2 size={{ xs: 12, md: 4 }}>
                <TextField label="Student Code" value={form.studentCode} fullWidth disabled />
              </Grid2>
              <Grid2 size={{ xs: 12, md: 4 }}>
                <TextField label="University" value={form.universityName} fullWidth disabled />
              </Grid2>
            </>
          ) : null}
        </Grid2>
    </Box>
  );

  return (
    <Stack spacing={2.2} sx={{ width: "100%", maxWidth: 1080, mx: "auto" }}>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Grid2 container spacing={2.5} alignItems="flex-start">
        <Grid2 size={{ xs: 12 }}>
          <Card
            className="ms-data-card"
            sx={{
              overflow: "hidden",
              background: "#FFFFFF",
            }}
          >
            <Box
              sx={{
                height: { xs: 142, md: 198 },
                background:
                  "linear-gradient(135deg, rgba(7,26,47,0.96) 0%, rgba(13,42,71,0.9) 42%, rgba(243,112,33,0.76) 100%)",
                position: "relative",
                "&:after": {
                  content: '""',
                  position: "absolute",
                  inset: 0,
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
                  backgroundSize: "34px 34px",
                },
              }}
            />
            <CardContent sx={{ px: { xs: 2.2, md: 3 }, pb: { xs: 2.4, md: 3 }, pt: 0 }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2.2}
                alignItems={{ xs: "center", md: "flex-start" }}
                sx={{ position: "relative", zIndex: 1 }}
              >
                  <Box
                    sx={{
                      position: "relative",
                      display: "inline-flex",
                      mt: { xs: -7.2, md: -8.8 },
                      borderRadius: "50%",
                      overflow: "hidden",
                      cursor: "pointer",
                      flex: "0 0 auto",
                      "&:hover .profile-avatar-overlay": {
                        opacity: 1,
                      },
                    }}
                    onClick={openAvatarDialog}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      style={{ display: "none" }}
                      onChange={onAvatarFileChange}
                    />
                    <Avatar
                      src={displayAvatarSrc || undefined}
                      imgProps={{ style: { objectFit: "cover", objectPosition: "center center" } }}
                      sx={{
                        width: { xs: 128, md: 156 },
                        height: { xs: 128, md: 156 },
                        bgcolor: brand.colors.orange,
                        border: "5px solid #FFFFFF",
                        boxShadow: "0 12px 32px rgba(7, 26, 47, 0.18)",
                        fontSize: { xs: 36, md: 44 },
                        fontWeight: 900,
                      }}
                    >
                      {getProfileInitials(displayProfile)}
                    </Avatar>
                    <Box
                      className="profile-avatar-overlay"
                      sx={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(15, 23, 42, 0.48)",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: 13,
                        opacity: 0,
                        transition: "opacity 0.18s ease",
                      }}
                    >
                      {uploadingAvatar ? "Uploading..." : "Manage avatar"}
                    </Box>
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: "center", md: "left" }, pt: { xs: 0, md: 2.2 } }}>
                    <Typography component="h1" sx={{ color: brand.colors.text, fontSize: { xs: 28, md: 33 }, fontWeight: 950, lineHeight: 1.12 }}>
                      {displayProfile.fullName || "Unnamed User"}
                    </Typography>
                    <Typography sx={{ mt: 0.45, color: brand.colors.muted, fontSize: 15, fontWeight: 800 }}>
                      @{displayProfile.username || "username"}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={0.8}
                      justifyContent={{ xs: "center", md: "flex-start" }}
                      flexWrap="wrap"
                      useFlexGap
                      sx={{ mt: 1 }}
                    >
                      {(profile?.roles || []).map((role) => (
                        <Chip key={role} label={role} size="small" sx={{ bgcolor: "#F2F4F7", color: brand.colors.navy, fontWeight: 850 }} />
                      ))}
                    </Stack>
                    <Typography
                      sx={{
                        mt: 1.25,
                        color: displayProfile.bio?.trim() ? brand.colors.text : brand.colors.muted,
                        fontSize: 14.5,
                        lineHeight: 1.65,
                        maxWidth: 700,
                        whiteSpace: "pre-line",
                      }}
                    >
                      {displayProfile.bio?.trim() || "Add a short bio from Edit profile."}
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    startIcon={<EditRoundedIcon />}
                    onClick={openEditProfile}
                    sx={{
                      alignSelf: { xs: "stretch", md: "flex-start" },
                      mt: { xs: 0.4, md: 2.7 },
                      px: 2.4,
                      borderRadius: 999,
                      bgcolor: brand.colors.navy,
                      boxShadow: "none",
                      "&:hover": { bgcolor: brand.colors.navySoft, boxShadow: "none" },
                    }}
                  >
                    Edit profile
                  </Button>
              </Stack>

              <Divider sx={{ my: { xs: 2, md: 2.4 } }} />

              <Box>
                <Typography sx={{ color: brand.colors.text, fontSize: 18, fontWeight: 950, mb: 1.2 }}>
                  Contact & Links
                </Typography>
                <Grid2 container spacing={1.2}>
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <ProfileInfoPill icon={<MailOutlineRoundedIcon fontSize="small" />} label="Email" value={profile?.email} />
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                    <ProfileInfoPill icon={<BadgeRoundedIcon fontSize="small" />} label="Status" value={profile?.status} />
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                    <ProfileInfoPill
                      icon={<CalendarTodayRoundedIcon fontSize="small" />}
                      label="Joined"
                      value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-GB") : "N/A"}
                    />
                  </Grid2>
                  <Grid2 size={{ xs: 12 }}>
                    <Box
                      sx={{
                        minHeight: "100%",
                        p: { xs: 1.4, md: 1.6 },
                        borderRadius: brand.radius.md,
                        bgcolor: "#F8FAFC",
                        border: `1px solid ${brand.colors.line}`,
                      }}
                    >
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        justifyContent="space-between"
                        sx={{ mb: visibleProfileLinks.length ? 1.25 : 0 }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" spacing={0.9} alignItems="center">
                            <Box
                              sx={{
                                width: 28,
                                height: 28,
                                borderRadius: 2,
                                bgcolor: "#FFFFFF",
                                color: brand.colors.orange,
                                display: "grid",
                                placeItems: "center",
                                border: `1px solid ${brand.colors.line}`,
                              }}
                            >
                              <LinkRoundedIcon fontSize="small" />
                            </Box>
                            <Box>
                              <Typography sx={{ color: brand.colors.text, fontSize: 14.5, fontWeight: 950, lineHeight: 1.1 }}>
                                Social links
                              </Typography>
                              <Typography sx={{ color: brand.colors.muted, fontSize: 12.5, mt: 0.25 }}>
                                Public profiles and portfolio links
                              </Typography>
                            </Box>
                          </Stack>
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditRoundedIcon />}
                          onClick={openEditProfile}
                          sx={{ borderRadius: 999, textTransform: "none", fontWeight: 850, bgcolor: "#FFFFFF" }}
                        >
                          {visibleProfileLinks.length ? "Edit links" : "Add social link"}
                        </Button>
                      </Stack>
                      {visibleProfileLinks.length ? (
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {visibleProfileLinks.map((link, index) => (
                            <ProfileLinkButton key={`${link.url}-${index}`} link={link} />
                          ))}
                        </Stack>
                      ) : (
                        <Box sx={{ p: 1.2, borderRadius: brand.radius.md, bgcolor: "#FFFFFF", border: `1px dashed ${brand.colors.lineStrong}` }}>
                          <Typography sx={{ color: brand.colors.muted, fontSize: 13 }}>
                            Add Facebook, GitHub, LinkedIn, portfolio, or another public profile link.
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Grid2>
                </Grid2>
              </Box>

              {isStudent ? (
              <Grid2 container spacing={1.4} sx={{ mt: 1.4 }}>
                <Grid2 size={{ xs: 12, md: 4 }}>
                  <Box sx={{ minWidth: 0, p: 1.6, borderRadius: brand.radius.md, bgcolor: "#F8FAFC", border: `1px solid ${brand.colors.line}` }}>
                    <Typography sx={{ color: brand.colors.text, fontSize: 15, fontWeight: 900, mb: 1.2 }}>
                      Roles
                    </Typography>
                    <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                      {(profile?.roles || []).map((role) => (
                        <Chip key={role} label={role} size="small" sx={{ bgcolor: "#FFFFFF", fontWeight: 850 }} />
                      ))}
                    </Stack>
                  </Box>
                </Grid2>

                  <Grid2 size={{ xs: 12, md: 8 }}>
                    <Box sx={{ minWidth: 0, p: 1.6, borderRadius: brand.radius.md, bgcolor: "#F8FAFC", border: `1px solid ${brand.colors.line}` }}>
                      <Typography sx={{ color: brand.colors.text, fontSize: 15, fontWeight: 900, mb: 1.2 }}>
                        Student Identity
                      </Typography>
                      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                        <Box>
                          <Typography sx={{ color: brand.colors.muted, fontSize: 12 }}>Type</Typography>
                          <Typography sx={{ color: brand.colors.text, fontWeight: 850 }}>{displayProfile.studentType || "N/A"}</Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ color: brand.colors.muted, fontSize: 12 }}>Student Code</Typography>
                          <Typography sx={{ color: brand.colors.text, fontWeight: 850 }}>{displayProfile.studentCode || "N/A"}</Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ color: brand.colors.muted, fontSize: 12 }}>University</Typography>
                          <Typography sx={{ color: brand.colors.text, fontWeight: 850 }}>{displayProfile.universityName || "N/A"}</Typography>
                        </Box>
                      </Stack>
                    </Box>
                  </Grid2>
              </Grid2>
              ) : null}
            </CardContent>
          </Card>
        </Grid2>

        <Grid2 size={{ xs: 12 }}>
          <Stack spacing={2.5}>
            {isStudent ? (
            <Card className="ms-data-card">
              <CardContent sx={{ p: { xs: 2.2, md: 2.6 } }}>
                <ProfileSectionHeader
                  title="Overview"
                  description={isStudent
                    ? "Your current participation snapshot across SEAL events and teams."
                    : "Your current role summary and account access overview."}
                />

                <Grid2 container spacing={2}>
                  {isStudent ? (
                    <>
                      <Grid2 size={{ xs: 12, md: 4 }}>
                        <ProfileStatTile icon={<GroupsRoundedIcon />} label="Teams" value={teams.length} tone="blue" />
                      </Grid2>
                      <Grid2 size={{ xs: 12, md: 4 }}>
                        <ProfileStatTile icon={<EventRoundedIcon />} label="Events" value={uniqueEvents.length} tone="green" />
                      </Grid2>
                      <Grid2 size={{ xs: 12, md: 4 }}>
                        <ProfileStatTile icon={<BadgeRoundedIcon />} label="Roles" value={profile?.roles?.length || 0} />
                      </Grid2>
                    </>
                  ) : (
                    <>
                      <Grid2 size={{ xs: 12, md: 4 }}>
                        <ProfileStatTile icon={<BadgeRoundedIcon />} label="Primary Role" value={profile?.roles?.[0] || "N/A"} tone="blue" />
                      </Grid2>
                      <Grid2 size={{ xs: 12, md: 4 }}>
                        <ProfileStatTile icon={<BadgeRoundedIcon />} label="Status" value={profile?.status || "N/A"} tone="green" />
                      </Grid2>
                      <Grid2 size={{ xs: 12, md: 4 }}>
                        <ProfileStatTile icon={<BadgeRoundedIcon />} label="Assigned Roles" value={profile?.roles?.length || 0} />
                      </Grid2>
                    </>
                  )}
                </Grid2>
              </CardContent>
            </Card>
            ) : null}

                {isStudent ? (
                  <Grid2 container spacing={2}>
                    <Grid2 size={{ xs: 12, md: 7 }}>
                      <Card className="ms-data-card" sx={{ height: "100%" }}>
                        <CardContent>
                          <ProfileSectionHeader
                            title="Active Teams"
                            description="Teams currently linked to your account."
                            action={<Chip size="small" label={`${teams.length} total`} />}
                          />
                          {teams.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              You are not participating in any team yet.
                            </Typography>
                          ) : (
                            <Stack spacing={1.4}>
                              {teams.map((team) => (
                                <Box
                                  key={team.teamId}
                                  sx={{
                                    border: "1px solid var(--se-line)",
                                    borderRadius: "var(--se-radius)",
                                    p: 2,
                                    background: "var(--se-surface-soft)",
                                  }}
                                >
                                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                                    <Box>
                                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                        {team.teamName}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {team.eventName} · {team.trackName}
                                      </Typography>
                                    </Box>
                                    <Chip
                                      size="small"
                                      color={team.membershipValid ? "success" : "warning"}
                                      label={team.membershipValid ? "Ready" : "Forming"}
                                    />
                                  </Stack>
                                  <Stack direction="row" spacing={2} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
                                    <Typography variant="body2" color="text.secondary">
                                      Leader: <strong style={{ color: "var(--se-text)" }}>{team.leaderName}</strong>
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      Members: <strong style={{ color: "var(--se-text)" }}>{team.memberCount} / 5</strong>
                                    </Typography>
                                  </Stack>
                                </Box>
                              ))}
                            </Stack>
                          )}
                        </CardContent>
                      </Card>
                    </Grid2>

                    <Grid2 size={{ xs: 12, md: 5 }}>
                      <Card className="ms-data-card" sx={{ height: "100%" }}>
                        <CardContent>
                          <ProfileSectionHeader
                            title="Current Events"
                            description="Events where your profile is currently participating."
                            action={<Chip size="small" label={`${uniqueEvents.length} active`} />}
                          />
                          {uniqueEvents.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              No active event participation is linked to this profile yet.
                            </Typography>
                          ) : (
                            <Stack spacing={1.4}>
                              {uniqueEvents.map((eventItem) => (
                                <Box
                                  key={eventItem.eventId}
                                  sx={{
                                    border: "1px solid var(--se-line)",
                                    borderRadius: "var(--se-radius)",
                                    p: 2,
                                  }}
                                >
                                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                    {eventItem.eventName}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6 }}>
                                    Participating through {eventItem.teamName} in {eventItem.trackName}.
                                  </Typography>
                                </Box>
                              ))}
                            </Stack>
                          )}
                        </CardContent>
                      </Card>
                    </Grid2>
                  </Grid2>
                ) : (
                  <Stack spacing={2}>
                    <Card className="ms-data-card">
                      <CardContent sx={{ p: { xs: 2.2, md: 2.5 } }}>
                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          spacing={1.5}
                          alignItems={{ xs: "stretch", md: "center" }}
                          justifyContent="space-between"
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ color: brand.colors.text, fontSize: 20, fontWeight: 950, lineHeight: 1.2 }}>
                              Roles
                            </Typography>
                            <Typography sx={{ color: brand.colors.muted, fontSize: 13.5, mt: 0.45 }}>
                              Current access on this account.
                            </Typography>
                          </Box>
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.1}
                            alignItems={{ xs: "stretch", sm: "center" }}
                            sx={{ flex: 1, justifyContent: { sm: "flex-end" }, minWidth: 0 }}
                          >
                            <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap justifyContent={{ xs: "flex-start", sm: "flex-end" }}>
                              {(profile?.roles || []).map((role) => (
                                <Chip key={role} label={role} size="small" sx={{ bgcolor: "#F2F4F7", color: brand.colors.navy, fontWeight: 850 }} />
                              ))}
                            </Stack>
                            <Button
                              variant="outlined"
                              endIcon={(
                                <ExpandMoreRoundedIcon
                                  sx={{
                                    transition: "transform 0.18s ease",
                                    transform: roleCapabilitiesOpen ? "rotate(180deg)" : "rotate(0deg)",
                                  }}
                                />
                              )}
                              onClick={() => setRoleCapabilitiesOpen((current) => !current)}
                              sx={{
                                flex: "0 0 auto",
                                borderRadius: 999,
                                px: 2,
                                textTransform: "none",
                                fontWeight: 850,
                              }}
                            >
                              {roleCapabilitiesOpen ? "Hide capabilities" : "View capabilities"}
                            </Button>
                          </Stack>
                        </Stack>

                        <Collapse in={roleCapabilitiesOpen} timeout="auto" unmountOnExit>
                          <Grid2 container spacing={1.2} sx={{ mt: 1.6 }}>
                            {roleCapabilities.length ? roleCapabilities.map((item) => (
                              <Grid2 key={item.title} size={{ xs: 12, md: 4 }}>
                                <CapabilityItem
                                  title={item.title}
                                  description={item.description}
                                  icon={item.icon}
                                />
                              </Grid2>
                            )) : (
                              <Grid2 size={{ xs: 12 }}>
                                <Box sx={{ p: 1.5, borderRadius: brand.radius.md, border: `1px dashed ${brand.colors.lineStrong}`, bgcolor: "#F8FAFC" }}>
                                  <Typography sx={{ color: brand.colors.text, fontWeight: 850 }}>No role capabilities available</Typography>
                                  <Typography sx={{ color: brand.colors.muted, fontSize: 13.5, mt: 0.45 }}>
                                    Capabilities will appear after this account receives a SEAL role.
                                  </Typography>
                                </Box>
                              </Grid2>
                            )}
                          </Grid2>
                        </Collapse>
                      </CardContent>
                    </Card>

                    <Card className="ms-data-card">
                      <CardContent sx={{ p: { xs: 2.2, md: 2.8 } }}>
                        <ProfileSectionHeader title="Recent Activity" description="Latest audited actions connected to this account." />
                        <Stack spacing={1.4}>
                          {recentActivity.length ? (
                            recentActivity.map((item) => (
                              <ActivityItem key={item.logId || `${item.actionType}-${item.timestamp}`} item={item} />
                            ))
                          ) : (
                            <Box
                              sx={{
                                minHeight: 230,
                                p: { xs: 2.2, md: 3.2 },
                                borderRadius: brand.radius.md,
                                border: `1px dashed ${brand.colors.lineStrong}`,
                                bgcolor: "#F8FAFC",
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              <Stack spacing={0.7}>
                                <Typography sx={{ color: brand.colors.text, fontSize: 20, fontWeight: 950 }}>
                                  No recent activity yet
                                </Typography>
                                <Typography sx={{ color: brand.colors.muted, fontSize: 14.5, lineHeight: 1.65, maxWidth: 620 }}>
                                  Audited event, account, assignment, and scoring changes will appear here when this profile performs coordinator work.
                                </Typography>
                              </Stack>
                            </Box>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Stack>
                )}
          </Stack>
        </Grid2>
      </Grid2>

      <Dialog
        open={editMode}
        onClose={cancelEdit}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: brand.radius.lg,
            boxShadow: "0 24px 70px rgba(7, 26, 47, 0.24)",
          },
        }}
      >
        <DialogContent sx={{ p: { xs: 2.2, md: 3 } }}>
          {editProfileContent}
        </DialogContent>
      </Dialog>

      <Dialog
        open={avatarDialogOpen}
        onClose={closeAvatarDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Update Avatar
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2.25}>
            <Typography variant="body2" color="text.secondary">
              Choose a new image, drag it to adjust the preview, then confirm when it looks right.
            </Typography>

            <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
              <Box
                sx={{
                  width: AVATAR_EDITOR_SIZE,
                  height: AVATAR_EDITOR_SIZE,
                  flex: "0 0 auto",
                  borderRadius: "50%",
                  overflow: "hidden",
                  position: "relative",
                  background: "linear-gradient(180deg, rgba(15,23,42,0.05) 0%, rgba(15,23,42,0.12) 100%)",
                  border: "1px solid",
                  borderColor: "divider",
                  boxShadow: "0 18px 48px rgba(15, 23, 42, 0.08)",
                  touchAction: "none",
                }}
                onPointerDown={onAvatarDragStart}
                onPointerMove={onAvatarDragMove}
                onPointerUp={onAvatarDragEnd}
                onPointerCancel={onAvatarDragEnd}
              >
                {avatarDialogMode === "replace" && avatarEditorUrl ? (
                  <Box
                    component="img"
                    ref={avatarImageRef}
                    src={avatarEditorUrl}
                    alt="Avatar preview"
                    onLoad={onAvatarPreviewImageLoad}
                    draggable={false}
                    sx={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      width: avatarEditorImageSize.width || "auto",
                      height: avatarEditorImageSize.height || "auto",
                      userSelect: "none",
                      transform: `translate(calc(-50% + ${avatarEditorOffset.x}px), calc(-50% + ${avatarEditorOffset.y}px)) scale(${avatarEditorScale})`,
                      transformOrigin: "center center",
                      cursor: "grab",
                      objectFit: "contain",
                      objectPosition: "center center",
                      maxWidth: "none",
                      maxHeight: "none",
                    }}
                  />
                ) : avatarDialogMode === "remove" ? (
                  <Stack
                    alignItems="center"
                    justifyContent="center"
                    spacing={1.2}
                    sx={{ width: "100%", height: "100%", px: 3, textAlign: "center" }}
                  >
                    <Avatar
                      sx={{
                        width: 84,
                        height: 84,
                        bgcolor: "grey.300",
                        color: "text.primary",
                        fontSize: 30,
                        fontWeight: 800,
                      }}
                    >
                      {getProfileInitials(profile)}
                    </Avatar>
                    <Typography variant="body2" color="text.secondary">
                      Your avatar will be reset to the default profile image.
                    </Typography>
                  </Stack>
                ) : displayAvatarSrc ? (
                  <Box
                    component="img"
                    src={displayAvatarSrc}
                    alt="Current avatar"
                    sx={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center" }}
                  />
                ) : (
                  <Avatar
                    sx={{
                      width: "100%",
                      height: "100%",
                      bgcolor: "primary.main",
                      color: "#fff",
                      fontSize: 64,
                      fontWeight: 800,
                    }}
                  >
                    {getProfileInitials(profile)}
                  </Avatar>
                )}
              </Box>
            </Box>

            {avatarDialogMode === "replace" && avatarEditorUrl ? (
              <>
                <Box sx={{ px: { xs: 0, sm: 2 } }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                    Zoom
                  </Typography>
                  <Slider
                    value={avatarEditorScale}
                    min={avatarEditorMinScale}
                    max={Math.max(avatarEditorMinScale + 2, avatarEditorMinScale * 3)}
                    step={0.01}
                    onChange={onAvatarScaleChange}
                    disabled={uploadingAvatar}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
                  Drag the image inside the preview circle to position it before updating.
                </Typography>
              </>
            ) : null}

            {avatarDialogError ? <Alert severity="error">{avatarDialogError}</Alert> : null}
            {uploadingAvatar ? <LinearProgress /> : null}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Button
                variant="outlined"
                fullWidth
                onClick={onChooseAvatarFileClick}
                disabled={uploadingAvatar}
              >
                Choose new image
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                fullWidth
                onClick={onRemoveAvatar}
                disabled={uploadingAvatar || !hasStoredAvatar}
                startIcon={<DeleteOutlineRoundedIcon />}
              >
                Reset to default
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={closeAvatarDialog} disabled={uploadingAvatar}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onConfirmAvatarUpdate}
            disabled={uploadingAvatar || !avatarActionPending}
          >
            {uploadingAvatar ? "Updating..." : "Update avatar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
