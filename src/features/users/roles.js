export const roleToUi = (roleFromBackend) =>
  roleFromBackend === "SELLER" ? "CAJERO" : roleFromBackend;

export const uiToBackendRole = (roleFromUi) =>
  roleFromUi === "CAJERO" ? "SELLER" : roleFromUi;

export const ROLE_OPTIONS_UI = ["ADMIN", "CAJERO"];
