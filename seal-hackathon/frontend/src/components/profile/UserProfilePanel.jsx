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
  Divider,
  Grid2,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { http, resolveAssetUrl } from "../../api/http";

const USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;
const PROFILE_DRAFT_STORAGE_KEY = "seal-profile-draft";

const EMPTY_FORM = {
  username: "",
  fullName: "",
  avatarUrl: "",
  bio: "",
  studentType: "",
  studentCode: "",
  universityName: "",
};

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
    studentType: profile?.studentType || "",
    studentCode: profile?.studentCode || "",
    universityName: profile?.universityName || "",
  };
}

export default function UserProfilePanel({ onDirtyChange = () => {} }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const editMode = searchParams.get("mode") === "edit";

  const isStudent = useMemo(() => profile?.roles?.includes("STUDENT"), [profile]);
  const roleHighlights = useMemo(() => {
    const roles = profile?.roles || [];
    const items = [];

    if (roles.includes("COORDINATOR")) {
      items.push({
        title: "Coordinator Workspace",
        description: "Manage approvals, events, tracks, and round configuration for SEAL seasons.",
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
        studentType: form.studentType,
        studentCode: form.studentCode,
        universityName: form.universityName,
      }
    : {
        fullName: profile?.fullName || "",
        username: profile?.username || "",
        avatarUrl: profile?.avatarUrl || "",
        bio: profile?.bio || "",
        studentType: profile?.studentType || "",
        studentCode: profile?.studentCode || "",
        universityName: profile?.universityName || "",
      };

  const emitProfileUpdated = (data) => {
    window.dispatchEvent(new CustomEvent("seal-profile-updated", { detail: data }));
  };

  const applyProfileData = (data, message = "") => {
    setProfile(data);
    setForm(toFormFromProfile(data));
    emitProfileUpdated(data);
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
      default:
        return "";
    }
  };

  const collectClientErrors = (nextForm = form) => ({
    username: validateField("username", nextForm.username),
    fullName: validateField("fullName", nextForm.fullName),
    bio: validateField("bio", nextForm.bio),
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
    }) !== JSON.stringify({
      username: profile.username || "",
      fullName: profile.fullName || "",
      avatarUrl: profile.avatarUrl || "",
      bio: profile.bio || "",
    });
  }, [form.avatarUrl, form.bio, form.fullName, form.username, profile]);

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
          },
        })
      );
    } else if (editMode && !profileDirty) {
      clearProfileDraft();
    }
  }, [editMode, form.avatarUrl, form.bio, form.fullName, form.username, onDirtyChange, profile?.email, profileDirty]);

  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

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

  const onSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    const allTouched = { username: true, fullName: true, bio: true };
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
        studentType: null,
        studentCode: null,
        universityName: null,
      };
      const response = await http.put("/api/users/me", payload);
      applyProfileData(response.data?.data, "Profile updated successfully");
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

  const onSelectAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const onAvatarFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setError("Avatar image must be JPG, PNG, WEBP, or GIF");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Avatar image must be 5 MB or smaller");
      return;
    }

    setUploadingAvatar(true);
    setError("");
    setSuccess("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await http.post("/api/users/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      applyProfileData(response.data?.data, "Avatar updated successfully");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onRemoveAvatar = async () => {
    setUploadingAvatar(true);
    setError("");
    setSuccess("");
    try {
      const response = await http.delete("/api/users/me/avatar");
      applyProfileData(response.data?.data, "Avatar removed successfully");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to remove avatar");
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

  return (
    <Stack spacing={2.5}>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Grid2 container spacing={3} alignItems="flex-start">
        <Grid2 size={{ xs: 12, lg: 3.5 }}>
          <Card className="ms-data-card">
            <CardContent>
              <Stack spacing={2.2}>
                <Box
                  sx={{
                    position: "relative",
                    display: "inline-flex",
                    alignSelf: { xs: "center", lg: "flex-start" },
                    borderRadius: "50%",
                    overflow: "hidden",
                    cursor: "pointer",
                    "&:hover .profile-avatar-overlay": {
                      opacity: 1,
                    },
                  }}
                  onClick={onSelectAvatarClick}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    style={{ display: "none" }}
                    onChange={onAvatarFileChange}
                  />
                  <Avatar
                    src={resolveAssetUrl(displayProfile.avatarUrl) || undefined}
                    sx={{ width: 180, height: 180, bgcolor: "primary.main", fontSize: 56 }}
                  >
                    {(displayProfile.fullName || displayProfile.username || "U").trim().charAt(0).toUpperCase()}
                  </Avatar>
                  <Box
                    className="profile-avatar-overlay"
                    sx={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(15, 23, 42, 0.42)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 14,
                      opacity: { xs: 1, md: 0 },
                      transition: "opacity 0.18s ease",
                    }}
                  >
                    {uploadingAvatar ? "Uploading..." : "Change avatar"}
                  </Box>
                  <IconButton
                    size="small"
                    sx={{
                      position: "absolute",
                      right: 10,
                      bottom: 10,
                      width: 34,
                      height: 34,
                      bgcolor: "#fff",
                      border: "1px solid",
                      borderColor: "divider",
                      boxShadow: "0 4px 12px rgba(15, 23, 42, 0.16)",
                      "&:hover": { bgcolor: "#fff" },
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectAvatarClick();
                    }}
                    disabled={uploadingAvatar}
                  >
                    <PhotoCameraRoundedIcon sx={{ fontSize: 18, color: "text.primary" }} />
                  </IconButton>
                </Box>

                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                    {displayProfile.fullName || "Unnamed User"}
                  </Typography>
                  <Typography variant="h6" color="text.secondary" sx={{ mt: 0.4, fontWeight: 500 }}>
                    @{displayProfile.username || "username"}
                  </Typography>
                </Box>

                <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.7 }}>
                  {displayProfile.bio?.trim() || "Add a short bio so mentors, judges, and coordinators can quickly understand who you are."}
                </Typography>

                <Stack spacing={1}>
                    <Button
                      variant="outlined"
                      startIcon={<EditRoundedIcon />}
                      onClick={() => {
                        setSearchParams({ section: "account", mode: "edit" });
                        setSuccess("");
                        setError("");
                      }}
                      fullWidth
                    >
                    Edit profile
                  </Button>
                  <Button
                    variant="text"
                    color="inherit"
                    startIcon={<DeleteOutlineRoundedIcon />}
                    onClick={onRemoveAvatar}
                    disabled={uploadingAvatar || !displayProfile.avatarUrl}
                    fullWidth
                  >
                    Remove avatar
                  </Button>
                </Stack>

                <Stack spacing={1.2}>
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <MailOutlineRoundedIcon fontSize="small" color="action" />
                    <Typography variant="body2">{profile?.email}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <BadgeRoundedIcon fontSize="small" color="action" />
                    <Typography variant="body2">Status: {profile?.status}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <CalendarTodayRoundedIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      Joined {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-GB") : "N/A"}
                    </Typography>
                  </Stack>
                </Stack>

                <Divider />

                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.2 }}>
                    Roles
                  </Typography>
                  <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                    {(profile?.roles || []).map((role) => (
                      <Chip key={role} label={role} size="small" />
                    ))}
                  </Stack>
                </Box>

                {isStudent ? (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.2 }}>
                        Student Identity
                      </Typography>
                      <Stack spacing={1}>
                        <Typography variant="body2" color="text.secondary">
                          Type
                        </Typography>
                        <Typography variant="body1">{displayProfile.studentType || "N/A"}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Student Code
                        </Typography>
                        <Typography variant="body1">{displayProfile.studentCode || "N/A"}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          University
                        </Typography>
                        <Typography variant="body1">{displayProfile.universityName || "N/A"}</Typography>
                      </Stack>
                    </Box>
                  </>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        </Grid2>

        <Grid2 size={{ xs: 12, lg: 8.5 }}>
          <Stack spacing={2.5}>
            {editMode ? (
              <Card className="ms-data-card">
                <CardContent>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    spacing={1.5}
                    sx={{ mb: 2 }}
                  >
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        Edit Profile
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Update how you appear across SEAL Hackathon modules.
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button variant="text" color="inherit" startIcon={<CloseRoundedIcon />} onClick={cancelEdit}>
                        Cancel
                      </Button>
                      <Button variant="contained" startIcon={<EditRoundedIcon />} onClick={onSave} disabled={isSaveDisabled}>
                        {saving ? "Saving..." : "Save profile"}
                      </Button>
                    </Stack>
                  </Stack>

                  <Grid2 container spacing={2}>
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
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="ms-data-card">
                  <CardContent>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Overview
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {isStudent
                        ? "Your current participation snapshot across SEAL events and teams."
                        : "Your current role summary and the modules available to this account."}
                    </Typography>

                    <Grid2 container spacing={2}>
                      {isStudent ? (
                        <>
                          <Grid2 size={{ xs: 12, md: 4 }}>
                            <Box className="ms-stat-card" sx={{ minHeight: 0 }}>
                              <Stack direction="row" spacing={1.2} alignItems="center">
                                <GroupsRoundedIcon color="primary" />
                                <Box>
                                  <Typography className="ms-stat-label">Teams</Typography>
                                  <Typography className="ms-stat-value">{teams.length}</Typography>
                                </Box>
                              </Stack>
                            </Box>
                          </Grid2>
                          <Grid2 size={{ xs: 12, md: 4 }}>
                            <Box className="ms-stat-card" sx={{ minHeight: 0 }}>
                              <Stack direction="row" spacing={1.2} alignItems="center">
                                <EventRoundedIcon color="success" />
                                <Box>
                                  <Typography className="ms-stat-label">Events</Typography>
                                  <Typography className="ms-stat-value">{uniqueEvents.length}</Typography>
                                </Box>
                              </Stack>
                            </Box>
                          </Grid2>
                          <Grid2 size={{ xs: 12, md: 4 }}>
                            <Box className="ms-stat-card" sx={{ minHeight: 0 }}>
                              <Stack direction="row" spacing={1.2} alignItems="center">
                                <BadgeRoundedIcon color="warning" />
                                <Box>
                                  <Typography className="ms-stat-label">Roles</Typography>
                                  <Typography className="ms-stat-value">{profile?.roles?.length || 0}</Typography>
                                </Box>
                              </Stack>
                            </Box>
                          </Grid2>
                        </>
                      ) : (
                        <>
                          <Grid2 size={{ xs: 12, md: 4 }}>
                            <Box className="ms-stat-card" sx={{ minHeight: 0 }}>
                              <Stack direction="row" spacing={1.2} alignItems="center">
                                <BadgeRoundedIcon color="primary" />
                                <Box>
                                  <Typography className="ms-stat-label">Primary Role</Typography>
                                  <Typography className="ms-stat-value">{profile?.roles?.[0] || "N/A"}</Typography>
                                </Box>
                              </Stack>
                            </Box>
                          </Grid2>
                          <Grid2 size={{ xs: 12, md: 4 }}>
                            <Box className="ms-stat-card" sx={{ minHeight: 0 }}>
                              <Stack direction="row" spacing={1.2} alignItems="center">
                                <BadgeRoundedIcon color="success" />
                                <Box>
                                  <Typography className="ms-stat-label">Status</Typography>
                                  <Typography className="ms-stat-value">{profile?.status || "N/A"}</Typography>
                                </Box>
                              </Stack>
                            </Box>
                          </Grid2>
                          <Grid2 size={{ xs: 12, md: 4 }}>
                            <Box className="ms-stat-card" sx={{ minHeight: 0 }}>
                              <Stack direction="row" spacing={1.2} alignItems="center">
                                <BadgeRoundedIcon color="warning" />
                                <Box>
                                  <Typography className="ms-stat-label">Assigned Roles</Typography>
                                  <Typography className="ms-stat-value">{profile?.roles?.length || 0}</Typography>
                                </Box>
                              </Stack>
                            </Box>
                          </Grid2>
                        </>
                      )}
                    </Grid2>
                  </CardContent>
                </Card>

                {isStudent ? (
                  <Grid2 container spacing={2}>
                    <Grid2 size={{ xs: 12, md: 7 }}>
                      <Card className="ms-data-card" sx={{ height: "100%" }}>
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              Active Teams
                            </Typography>
                            <Chip size="small" label={`${teams.length} total`} />
                          </Stack>
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
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              Current Events
                            </Typography>
                            <Chip size="small" label={`${uniqueEvents.length} active`} />
                          </Stack>
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
                  <Grid2 container spacing={2}>
                    <Grid2 size={{ xs: 12, md: 7 }}>
                      <Card className="ms-data-card" sx={{ height: "100%" }}>
                        <CardContent>
                          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                            Role Overview
                          </Typography>
                          <Stack spacing={1.4}>
                            {roleHighlights.map((item) => (
                              <Box
                                key={item.title}
                                sx={{
                                  border: "1px solid var(--se-line)",
                                  borderRadius: "var(--se-radius)",
                                  p: 2,
                                  background: "var(--se-surface-soft)",
                                }}
                              >
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                  {item.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6 }}>
                                  {item.description}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid2>

                    <Grid2 size={{ xs: 12, md: 5 }}>
                      <Card className="ms-data-card" sx={{ height: "100%" }}>
                        <CardContent>
                          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                            Access Summary
                          </Typography>
                          <Stack spacing={1.2}>
                            <Typography variant="body2" color="text.secondary">
                              This account can access only the modules assigned to the roles below.
                            </Typography>
                            <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                              {(profile?.roles || []).map((role) => (
                                <Chip key={role} label={role} size="small" />
                              ))}
                            </Stack>
                            <Divider sx={{ my: 0.5 }} />
                            <Typography variant="body2" color="text.secondary">
                              Student-only participation blocks such as team membership and current event involvement are hidden for this account.
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid2>
                  </Grid2>
                )}
              </>
            )}
          </Stack>
        </Grid2>
      </Grid2>
    </Stack>
  );
}
