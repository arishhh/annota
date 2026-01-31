import { env } from './config/env';

// Check env vars before import app
env.checkEnv();

import app from './app';

const PORT = env.PORT;

app.listen(PORT, () => {
    console.log(`🚀 API running at http://localhost:${PORT}`);
});
