import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import type {
  ArtifactMetadata,
  AssessmentAttemptState,
  AssessmentLevelProbabilities,
  ExampleSentenceList,
  GenerationJobEventPayload,
  GenerationRequestSnapshot,
  NlpCandidateContext,
  NotificationPayload,
  ProcessingWarningList,
  SubtitleAvailabilityMetadata,
  SubtitleSnapshotMetadata,
  TmdbRawPayload,
} from "./json-contracts";

/*
  The schema keeps current pipeline-derived JSONB contracts typed, but intentionally not versioned.
  If NLP or LLM payload shapes change in a breaking way, purge and rebuild the affected derived
  data instead of accumulating compatibility layers in the application schema.
*/

const auditColumns = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
};

export const userRoleEnum = pgEnum("user_role", ["learner", "admin"]);
export const cefrLevelEnum = pgEnum("cefr_level", ["A1", "A2", "B1", "B2", "C1", "C2"]);
export const assessmentAttemptStatusEnum = pgEnum("assessment_attempt_status", [
  "in_progress",
  "completed",
]);
export const contentKindEnum = pgEnum("content_kind", ["movie", "season"]);
export const subtitleProviderEnum = pgEnum("subtitle_provider", ["opensubtitles", "manual_upload"]);
export const subtitleFormatEnum = pgEnum("subtitle_format", ["srt", "plain_text"]);
export const subtitleAvailabilityStatusEnum = pgEnum("subtitle_availability_status", [
  "available",
  "unavailable",
  "error",
]);
export const artifactKindEnum = pgEnum("artifact_kind", ["subtitle", "audio", "image", "avatar"]);
export const artifactAccessEnum = pgEnum("artifact_access", ["private", "signed", "public"]);
export const runStatusEnum = pgEnum("run_status", ["queued", "running", "completed", "failed"]);
export const extractionSourceEnum = pgEnum("extraction_source", ["nlp", "llm"]);
export const vocabularyKindEnum = pgEnum("vocabulary_kind", [
  "word",
  "phrasal_verb",
  "idiom",
  "slang",
]);
export const jobStatusEnum = pgEnum("job_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
export const jobStageEnum = pgEnum("job_stage", [
  "queued",
  "fetching_subtitles",
  "running_nlp",
  "running_llm",
  "generating_content",
  "saving_pack",
  "completed",
  "failed",
]);
export const frequencyPreferenceEnum = pgEnum("frequency_preference", [
  "balanced",
  "common_first",
  "challenge_first",
]);
export const packStatusEnum = pgEnum("pack_status", ["active", "archived"]);
export const cardStateEnum = pgEnum("card_state", [
  "new",
  "learning",
  "due",
  "mastered",
  "removed",
]);
export const reviewRatingEnum = pgEnum("review_rating", ["again", "hard", "good", "easy"]);
export const userTermStateEnum = pgEnum("user_term_state", [
  "unseen",
  "learning",
  "known",
  "ignored",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "pack_ready",
  "reviews_due",
  "streak_risk",
  "system",
]);
export const notificationChannelEnum = pgEnum("notification_channel", ["in_app", "email"]);
export const notificationStatusEnum = pgEnum("notification_status", [
  "queued",
  "sent",
  "read",
  "dismissed",
  "failed",
]);

/*
  Better Auth core tables remain first-class because the existing app already depends on them.
*/
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: userRoleEnum("role").default("learner").notNull(),
  ...auditColumns,
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ...auditColumns,
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  ...auditColumns,
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ...auditColumns,
});

/*
  Learner profile and preferences.
  Preferences store machine-friendly codes, while the UI can still map them to labels.
*/
export const cefrProfile = pgTable("cefr_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  assessedLevel: cefrLevelEnum("assessed_level"),
  assessedConfidence: real("assessed_confidence"),
  assessedAt: timestamp("assessed_at"),
  manualOverrideLevel: cefrLevelEnum("manual_override_level"),
  manualOverrideAt: timestamp("manual_override_at"),
  ...auditColumns,
});

export const cefrAssessmentAttempt = pgTable("cefr_assessment_attempt", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  status: assessmentAttemptStatusEnum("status").default("in_progress").notNull(),
  state: jsonb("state").$type<AssessmentAttemptState>().notNull(),
  answeredCount: integer("answered_count").default(0).notNull(),
  thetaMean: real("theta_mean"),
  thetaLow: real("theta_low"),
  thetaHigh: real("theta_high"),
  level: cefrLevelEnum("level"),
  confidence: real("confidence"),
  borderlineLabel: text("borderline_label"),
  levelProbabilities: jsonb("level_probabilities").$type<AssessmentLevelProbabilities>(),
  completedAt: timestamp("completed_at"),
  ...auditColumns,
});

export const cefrAssessmentResponse = pgTable(
  "cefr_assessment_response",
  {
    id: text("id").primaryKey(),
    attemptId: text("attempt_id")
      .notNull()
      .references(() => cefrAssessmentAttempt.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    itemLevel: cefrLevelEnum("item_level").notNull(),
    itemDifficulty: real("item_difficulty").notNull(),
    sequence: integer("sequence").notNull(),
    selectedIndex: integer("selected_index"),
    isDontKnow: boolean("is_dont_know").default(false).notNull(),
    isCorrect: boolean("is_correct").notNull(),
    responseTimeMs: integer("response_time_ms"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("cefr_assessment_response_attempt_item_unique").on(table.attemptId, table.itemId),
  ],
);

export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  studyLanguageCode: text("study_language_code").default("en").notNull(),
  dailyWordsGoal: integer("daily_words_goal").default(20).notNull(),
  frequencyPreference: frequencyPreferenceEnum("frequency_preference")
    .default("balanced")
    .notNull(),
  studyVocabularyTypes: vocabularyKindEnum("study_vocabulary_types")
    .array()
    .default(sql`ARRAY['word', 'phrasal_verb', 'idiom', 'slang']::vocabulary_kind[]`)
    .notNull(),
  emailRemindersEnabled: boolean("email_reminders_enabled").default(true).notNull(),
  streakAlertsEnabled: boolean("streak_alerts_enabled").default(true).notNull(),
  ...auditColumns,
});

/*
  Cached TMDB-backed learning targets.

  Movies are canonical by TMDB movie ID.
  Seasons are canonical by (tmdb_show_id, season_number).
*/
export const content = pgTable(
  "content",
  {
    id: text("id").primaryKey(),
    kind: contentKindEnum("kind").notNull(),
    tmdbMovieId: integer("tmdb_movie_id"),
    tmdbShowId: integer("tmdb_show_id"),
    tmdbSeasonNumber: integer("tmdb_season_number"),
    tmdbSeasonId: integer("tmdb_season_id"),
    title: text("title").notNull(),
    originalTitle: text("original_title"),
    // Normalize TMDB empty-string overviews to NULL on ingest.
    overview: text("overview"),
    originalLanguage: text("original_language"),
    posterPath: text("poster_path"),
    backdropPath: text("backdrop_path"),
    releaseDate: timestamp("release_date"),
    firstAirDate: timestamp("first_air_date"),
    runtimeMinutes: integer("runtime_minutes"),
    episodeCount: integer("episode_count"),
    voteAverage: real("vote_average"),
    voteCount: integer("vote_count"),
    tmdbRaw: jsonb("tmdb_raw").$type<TmdbRawPayload>(),
    lastTmdbSyncedAt: timestamp("last_tmdb_synced_at"),
    ...auditColumns,
  },
  (table) => [
    check(
      "content_movie_shape_check",
      sql`(${table.kind} <> 'movie') OR (${table.tmdbMovieId} IS NOT NULL AND ${table.tmdbShowId} IS NULL AND ${table.tmdbSeasonNumber} IS NULL)`,
    ),
    check(
      "content_season_shape_check",
      sql`(${table.kind} <> 'season') OR (${table.tmdbShowId} IS NOT NULL AND ${table.tmdbSeasonNumber} IS NOT NULL AND ${table.tmdbMovieId} IS NULL)`,
    ),
    uniqueIndex("content_movie_tmdb_unique")
      .on(table.tmdbMovieId)
      .where(sql`${table.kind} = 'movie'`),
    uniqueIndex("content_season_tmdb_unique")
      .on(table.tmdbShowId, table.tmdbSeasonNumber)
      .where(sql`${table.kind} = 'season'`),
    index("content_kind_idx").on(table.kind),
  ],
);

/*
  Generic object-storage metadata.
  The DB stores object facts and ownership, not the binary payloads themselves.
*/
export const artifactObject = pgTable(
  "artifact_object",
  {
    id: text("id").primaryKey(),
    kind: artifactKindEnum("kind").notNull(),
    access: artifactAccessEnum("access").default("private").notNull(),
    provider: text("provider").default("r2").notNull(),
    bucketName: text("bucket_name").notNull(),
    objectKey: text("object_key").notNull(),
    publicUrl: text("public_url"),
    mimeType: text("mime_type"),
    byteSize: integer("byte_size"),
    checksumSha256: text("checksum_sha256"),
    metadata: jsonb("metadata").$type<ArtifactMetadata>(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("artifact_object_bucket_key_unique").on(table.bucketName, table.objectKey),
    index("artifact_object_kind_idx").on(table.kind),
  ],
);

/*
  Persist subtitle-provider lookup outcomes, including negative results.
  This keeps the UI honest and avoids hammering providers for known misses.
*/
export const contentSubtitleAvailability = pgTable(
  "content_subtitle_availability",
  {
    contentId: text("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    provider: subtitleProviderEnum("provider").notNull(),
    status: subtitleAvailabilityStatusEnum("status").notNull(),
    checkedAt: timestamp("checked_at").defaultNow().notNull(),
    retryAfter: timestamp("retry_after"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata").$type<SubtitleAvailabilityMetadata>(),
    ...auditColumns,
  },
  (table) => [
    primaryKey({
      columns: [table.contentId, table.provider],
      name: "content_subtitle_availability_pkey",
    }),
    index("content_subtitle_availability_status_retry_idx").on(table.status, table.retryAfter),
  ],
);

/*
  One immutable subtitle snapshot for one content item.
  For TV seasons, this snapshot represents one merged season corpus.
*/
export const contentSourceSnapshot = pgTable(
  "content_source_snapshot",
  {
    id: text("id").primaryKey(),
    contentId: text("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    provider: subtitleProviderEnum("provider").notNull(),
    format: subtitleFormatEnum("format").default("srt").notNull(),
    providerExternalId: text("provider_external_id"),
    providerVersion: text("provider_version"),
    releaseName: text("release_name"),
    suppliedByUserId: text("supplied_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    subtitleArtifactId: text("subtitle_artifact_id").references(() => artifactObject.id, {
      onDelete: "set null",
    }),
    normalizedTextHash: text("normalized_text_hash").notNull(),
    lineCount: integer("line_count"),
    isActive: boolean("is_active").default(true).notNull(),
    metadata: jsonb("metadata").$type<SubtitleSnapshotMetadata>(),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("content_source_snapshot_active_content_unique")
      .on(table.contentId)
      .where(sql`${table.isActive} = true`),
    uniqueIndex("content_source_snapshot_content_hash_unique").on(
      table.contentId,
      table.normalizedTextHash,
    ),
  ],
);

/*
  Canonical reusable processing run for one content item and pipeline fingerprint.
*/
export const contentProcessingRun = pgTable(
  "content_processing_run",
  {
    id: text("id").primaryKey(),
    contentId: text("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    sourceSnapshotId: text("source_snapshot_id")
      .notNull()
      .references(() => contentSourceSnapshot.id, { onDelete: "restrict" }),
    status: runStatusEnum("status").default("queued").notNull(),
    pipelineFingerprint: text("pipeline_fingerprint").notNull(),
    nlpPipelineVersion: text("nlp_pipeline_version").notNull(),
    llmPipelineVersion: text("llm_pipeline_version"),
    promptVersion: text("prompt_version"),
    warnings: jsonb("warnings").$type<ProcessingWarningList>(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("content_processing_run_fingerprint_unique").on(
      table.contentId,
      table.pipelineFingerprint,
    ),
    index("content_processing_run_status_idx").on(table.status),
  ],
);

/*
  Canonical reusable vocabulary term.
  Cross-title mastery anchors here, while content-specific evidence stays on contentVocabularyItem.
*/
export const vocabularyTerm = pgTable(
  "vocabulary_term",
  {
    id: text("id").primaryKey(),
    kind: vocabularyKindEnum("kind").notNull(),
    normalizedText: text("normalized_text").notNull(),
    lemma: text("lemma"),
    displayText: text("display_text").notNull(),
    partOfSpeech: text("part_of_speech"),
    baseCefrLevel: cefrLevelEnum("base_cefr_level"),
    baseCefrNumeric: integer("base_cefr_numeric"),
    notes: text("notes"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("vocabulary_term_kind_text_unique").on(table.kind, table.normalizedText),
    index("vocabulary_term_kind_idx").on(table.kind),
  ],
);

/*
  Reusable content-level vocabulary evidence plus enrichment.
  `contexts` intentionally mirrors the current NLP service candidate context contract.
*/
export const contentVocabularyItem = pgTable(
  "content_vocabulary_item",
  {
    id: text("id").primaryKey(),
    processingRunId: text("processing_run_id")
      .notNull()
      .references(() => contentProcessingRun.id, { onDelete: "cascade" }),
    contentId: text("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    termId: text("term_id")
      .notNull()
      .references(() => vocabularyTerm.id, { onDelete: "restrict" }),
    extractionSource: extractionSourceEnum("extraction_source").notNull(),
    surfaceForm: text("surface_form").notNull(),
    representativeContext: text("representative_context"),
    contexts: jsonb("contexts").$type<NlpCandidateContext[]>(),
    occurrenceCount: integer("occurrence_count").default(1).notNull(),
    frequencyRank: integer("frequency_rank"),
    cefrLevel: cefrLevelEnum("cefr_level"),
    cefrNumeric: integer("cefr_numeric"),
    cefrConfidence: real("cefr_confidence"),
    cefrNote: text("cefr_note"),
    meaning: text("meaning"),
    exampleSentences: jsonb("example_sentences").$type<ExampleSentenceList>(),
    audioArtifactId: text("audio_artifact_id").references(() => artifactObject.id, {
      onDelete: "set null",
    }),
    imageArtifactId: text("image_artifact_id").references(() => artifactObject.id, {
      onDelete: "set null",
    }),
    isSelectable: boolean("is_selectable").default(true).notNull(),
    filteredOutReason: text("filtered_out_reason"),
    enrichedAt: timestamp("enriched_at"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("content_vocabulary_item_run_term_unique").on(table.processingRunId, table.termId),
    index("content_vocabulary_item_content_idx").on(table.contentId),
    index("content_vocabulary_item_term_idx").on(table.termId),
    index("content_vocabulary_item_source_idx").on(table.extractionSource),
  ],
);

/*
  User-visible generation job. This is what the frontend polls.
*/
export const generationJob = pgTable(
  "generation_job",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    contentId: text("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    processingRunId: text("processing_run_id").references(() => contentProcessingRun.id, {
      onDelete: "set null",
    }),
    status: jobStatusEnum("status").default("queued").notNull(),
    stage: jobStageEnum("stage").default("queued").notNull(),
    progressMessage: text("progress_message"),
    idempotencyKey: text("idempotency_key").notNull(),
    triggerWorkflowId: text("trigger_workflow_id"),
    requestSnapshot: jsonb("request_snapshot").$type<GenerationRequestSnapshot>().notNull(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("generation_job_user_idempotency_unique").on(table.userId, table.idempotencyKey),
    index("generation_job_content_status_idx").on(table.contentId, table.status),
    index("generation_job_user_status_idx").on(table.userId, table.status),
  ],
);

/*
  Immutable stage/event history for generation jobs.
*/
export const generationJobEvent = pgTable(
  "generation_job_event",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => generationJob.id, { onDelete: "cascade" }),
    stage: jobStageEnum("stage").notNull(),
    message: text("message"),
    payload: jsonb("payload").$type<GenerationJobEventPayload>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("generation_job_event_job_stage_idx").on(table.jobId, table.stage)],
);

/*
  Exactly one pack exists per user per content item.
  Regeneration replaces the previous pack instead of versioning it.
*/
export const pack = pgTable(
  "pack",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    contentId: text("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    sourceJobId: text("source_job_id").references(() => generationJob.id, { onDelete: "set null" }),
    processingRunId: text("processing_run_id")
      .notNull()
      .references(() => contentProcessingRun.id, { onDelete: "restrict" }),
    status: packStatusEnum("status").default("active").notNull(),
    name: text("name").notNull(),
    learnerCefrLevelAtGeneration: cefrLevelEnum("learner_cefr_level_at_generation"),
    frequencyPreferenceAtGeneration: frequencyPreferenceEnum(
      "frequency_preference_at_generation",
    ).notNull(),
    selectedVocabularyTypes: vocabularyKindEnum("selected_vocabulary_types").array().notNull(),
    itemCount: integer("item_count").default(0).notNull(),
    estimatedStudyMinutes: integer("estimated_study_minutes"),
    archivedAt: timestamp("archived_at"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("pack_user_content_unique").on(table.userId, table.contentId),
    index("pack_status_idx").on(table.status),
  ],
);

/*
  Pack item = current flashcard row.
  Mutable SRS state lives here; immutable review history lives in reviewEvent.
*/
export const packItem = pgTable(
  "pack_item",
  {
    id: text("id").primaryKey(),
    packId: text("pack_id")
      .notNull()
      .references(() => pack.id, { onDelete: "cascade" }),
    contentVocabularyItemId: text("content_vocabulary_item_id")
      .notNull()
      .references(() => contentVocabularyItem.id, { onDelete: "restrict" }),
    termId: text("term_id")
      .notNull()
      .references(() => vocabularyTerm.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull(),
    includedReason: text("included_reason"),
    state: cardStateEnum("state").default("new").notNull(),
    dueAt: timestamp("due_at"),
    lastReviewedAt: timestamp("last_reviewed_at"),
    lastRating: reviewRatingEnum("last_rating"),
    repetitionCount: integer("repetition_count").default(0).notNull(),
    lapseCount: integer("lapse_count").default(0).notNull(),
    intervalDays: integer("interval_days"),
    easeFactor: real("ease_factor").default(2.5).notNull(),
    firstStudiedAt: timestamp("first_studied_at"),
    masteredAt: timestamp("mastered_at"),
    removedAt: timestamp("removed_at"),
    removalReason: text("removal_reason"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("pack_item_pack_candidate_unique").on(table.packId, table.contentVocabularyItemId),
    uniqueIndex("pack_item_pack_sort_order_unique").on(table.packId, table.sortOrder),
    index("pack_item_pack_state_idx").on(table.packId, table.state),
    index("pack_item_due_idx").on(table.state, table.dueAt),
    index("pack_item_term_idx").on(table.termId),
  ],
);

/*
  Immutable review history.
  V1 keeps this intentionally thin instead of storing large before/after state snapshots.
*/
export const reviewEvent = pgTable(
  "review_event",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    packItemId: text("pack_item_id")
      .notNull()
      .references(() => packItem.id, { onDelete: "cascade" }),
    termId: text("term_id")
      .notNull()
      .references(() => vocabularyTerm.id, { onDelete: "restrict" }),
    rating: reviewRatingEnum("rating").notNull(),
    reviewedAt: timestamp("reviewed_at").defaultNow().notNull(),
    responseTimeMs: integer("response_time_ms"),
  },
  (table) => [
    index("review_event_user_reviewed_at_idx").on(table.userId, table.reviewedAt),
    index("review_event_pack_item_reviewed_at_idx").on(table.packItemId, table.reviewedAt),
    index("review_event_term_reviewed_at_idx").on(table.termId, table.reviewedAt),
  ],
);

/*
  Cross-pack knowledge state per user and canonical term.
*/
export const userTermState = pgTable(
  "user_term_state",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    termId: text("term_id")
      .notNull()
      .references(() => vocabularyTerm.id, { onDelete: "cascade" }),
    state: userTermStateEnum("state").default("unseen").notNull(),
    source: text("source").default("derived").notNull(),
    totalReviews: integer("total_reviews").default(0).notNull(),
    totalLapses: integer("total_lapses").default(0).notNull(),
    lastPackItemId: text("last_pack_item_id").references(() => packItem.id, {
      onDelete: "set null",
    }),
    firstSeenAt: timestamp("first_seen_at"),
    lastSeenAt: timestamp("last_seen_at"),
    lastReviewedAt: timestamp("last_reviewed_at"),
    knownAt: timestamp("known_at"),
    ignoredAt: timestamp("ignored_at"),
    notes: text("notes"),
    ...auditColumns,
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.termId], name: "user_term_state_pkey" }),
    index("user_term_state_user_state_idx").on(table.userId, table.state),
  ],
);

/*
  Persisted streak snapshot.
  This is derived from review history, but materializing it keeps reminder logic simple.
*/
export const userStreak = pgTable("user_streak", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  currentStreakDays: integer("current_streak_days").default(0).notNull(),
  longestStreakDays: integer("longest_streak_days").default(0).notNull(),
  lastStudyAt: timestamp("last_study_at"),
  streakStartedAt: timestamp("streak_started_at"),
  ...auditColumns,
});

/*
  Minimal notification model for in-app notifications now and delivery tracking later.
*/
export const notification = pgTable(
  "notification",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    channel: notificationChannelEnum("channel").default("in_app").notNull(),
    status: notificationStatusEnum("status").default("queued").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    payload: jsonb("payload").$type<NotificationPayload>(),
    scheduledFor: timestamp("scheduled_for"),
    sentAt: timestamp("sent_at"),
    readAt: timestamp("read_at"),
    dismissedAt: timestamp("dismissed_at"),
    ...auditColumns,
  },
  (table) => [
    index("notification_user_status_idx").on(table.userId, table.status),
    index("notification_user_type_idx").on(table.userId, table.type),
  ],
);
