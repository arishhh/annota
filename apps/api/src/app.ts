import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import healthRouter from './routes/health';
import dbRouter from './routes/db';
import projectsRouter from './routes/projects';
import commentsRouter from './routes/comments';
import publicRouter from './routes/public';
import approvalRouter from './routes/approval';

const app = express();

app.use(cors({
    origin: env.CORS_ORIGIN,
}));
app.use(express.json());

// Routes
app.use('/health', healthRouter);
app.use('/db', dbRouter);

// New MVP Routes
app.use('/projects', projectsRouter); // Protected
app.use('/comments', commentsRouter); // Protected
app.use('/f', publicRouter);          // Public
app.use('/approval', approvalRouter); // Mixed

export default app;
