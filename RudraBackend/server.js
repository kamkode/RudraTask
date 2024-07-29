const express = require('express');
const cors = require('cors');
const { ApolloServer } = require('apollo-server-express');
const typeDefs = require('./src/api/graphql/Schemas/index');
const resolvers = require('./src/api/graphql/Resolvers/index');
const auth = require('./middleware/auth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      const { userobj, isAuth } = req;
      return { req, isAuth, userobj };
    },
    formatError: (error) => {
      console.error('GraphQL Error:', error);
      return error;
    },
  });

  await server.start();

  app.use(cors());
  app.use(express.json());
  app.use(auth);

  server.applyMiddleware({ app, path: '/graphql' });

  app.listen(PORT, () => {
    console.log(`Server ready at http://localhost:${PORT}${server.graphqlPath}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});