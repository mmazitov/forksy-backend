import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { expressMiddleware } from '@as-integrations/express4';
import cors from 'cors';
import express, { json } from 'express';
import session from 'express-session';
import http from 'http';
import passport from 'passport';
import { createContext } from './context.js';
import oauthRouter from './oauth.js';
import './passport/strategies.js';
import { resolvers } from './resolvers.js';
import { typeDefs } from './schema.js';

const app = express();
const httpServer = http.createServer(app);

const allowedOrigins = [
	process.env.CLIENT_URL || 'http://localhost:5173',
	'https://forksy.vercel.app',
	'http://localhost:5173',
];

// Глобальні middleware
app.use(
	cors({
		origin: allowedOrigins,
		credentials: true,
	})
);
app.use(json());

// Session для Passport
app.use(
	session({
		secret: process.env.SESSION_SECRET || 'your-session-secret',
		resave: false,
		saveUninitialized: false,
		cookie: {
			secure: process.env.NODE_ENV === 'production',
			maxAge: 24 * 60 * 60 * 1000,
		},
	}) as any
);

app.use(passport.initialize() as any);
app.use(passport.session() as any);

// Routes
app.get('/', (req, res) => {
	res.json({
		status: 'ok',
		message: 'Forksy API is running',
		endpoints: {
			graphql: '/graphql',
			auth: '/auth',
		},
	});
});

app.use('/auth', oauthRouter);

// Apollo Server
const server = new ApolloServer({
	typeDefs,
	resolvers,
	plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

const startServer = async () => {
	await server.start();

	app.use(
		'/graphql',
		expressMiddleware(server, {
			context: async ({ req }) => createContext({ req }),
		})
	);

	const PORT = parseInt(process.env.PORT || '4000', 10);

	await new Promise<void>((resolve) =>
		httpServer.listen({ port: PORT }, resolve)
	);

	console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
	console.log(`🔐 OAuth endpoints at http://localhost:${PORT}/auth`);
};

startServer().catch((err) => {
	console.error('Failed to start server:', err);
	process.exit(1);
});
