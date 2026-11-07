// The local agent service needs a separately hosted backend before cloud runs
// can be enabled. Return an explicit status instead of simulating a live run.
module.exports = function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.status(503).json({
    connected: false,
    error: 'The SwitchFlow website is deployed. Live workflows need a hosted Switch agent backend; the Windows localhost service is not reachable from Vercel.'
  });
};
