<?php
// Normal read-state persistence is the default. Set this environment variable to 1
// on the PHP server only for a presentation that resets seeded notices on reload.
const PRESENTATION_RESET_ENV = 'SINBUVI_PRESENTATION_RESET';
const PRESENTATION_RESET_DEMO_NOTIFICATIONS = false;
function presentation_reset_enabled(): bool { return PRESENTATION_RESET_DEMO_NOTIFICATIONS || getenv(PRESENTATION_RESET_ENV)==='1'; }
