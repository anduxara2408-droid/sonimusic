const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurer le stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    if (file.fieldname === 'audio') {
      uploadPath += 'audio/';
    } else if (file.fieldname === 'cover') {
      uploadPath += 'covers/';
    }
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Filtrer les fichiers
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'audio') {
    // Accepter les fichiers audio
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Format audio non supporté'), false);
    }
  } else if (file.fieldname === 'cover') {
    // Accepter les images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Format d\'image non supporté'), false);
    }
  } else {
    cb(new Error('Champ non autorisé'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max pour l'audio
  }
});

module.exports = upload;
