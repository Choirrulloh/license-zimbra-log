class DocsController {
  constructor() {
    this.index = this.index.bind(this);
  }

  async index(req, res) {
    try {
      // Get server URL from env or request
      const serverUrl = process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`;

      res.render('docs/index', {
        user: req.session,
        currentPage: 'docs',
        pageTitle: 'API Documentation',
        serverUrl
      });
    } catch (error) {
      console.error('Error loading docs:', error);
      res.status(500).send('Error loading documentation');
    }
  }
}

module.exports = new DocsController();
