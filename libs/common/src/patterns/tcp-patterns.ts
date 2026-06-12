export const TCP_PATTERNS = {
  AUTH: {
    PING: 'auth.ping',
    LOGIN: 'auth.login',
    REGISTER: 'auth.register',
    VALIDATE_TOKEN: 'auth.validate_token',
    GET_PROFILE: 'auth.get_profile',
  },
  REGISTER: {
    PING: 'register.ping',
    CREATE_REPORT: 'register.create_report',
    GET_REPORT: 'register.get_report',
    LIST_REPORTS: 'register.list_reports',
    GET_HEATMAP: 'register.get_heatmap',
  },
  ADMIN: {
    PING: 'admin.ping',
    LIST_PENDING: 'admin.list_pending',
    ACCEPT_REPORT: 'admin.accept_report',
    REJECT_REPORT: 'admin.reject_report',
    CREATE_GROUP: 'admin.create_group',
    UPDATE_CASE: 'admin.update_case',
    BAN_DEVICE: 'admin.ban_device',
  },
  GAMIFY: {
    PING: 'gamify.ping',
    AWARD_POINTS: 'gamify.award_points',
    GET_USER_STATS: 'gamify.get_user_stats',
    GET_LEVELS: 'gamify.get_levels',
  },
} as const;
