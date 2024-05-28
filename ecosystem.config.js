module.exports = {
  apps: [{
    script: 'npm start',
  }],

  deploy: {
    production: {
      user: 'root',
      host: '147.45.239.244',
      ref: 'origin/master',
      repo: 'git@github.com:Apachai979/onestep.git',
      path: '/home/onestep',
      'pre-deploy-local': '',
      'post-deploy': ' source ~/.nmv/nvm.sh && npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'ForwardAgent=yes'
    }
  }
};
