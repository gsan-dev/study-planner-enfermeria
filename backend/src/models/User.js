import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'El email no es válido'],
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
      select: false,
    },
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: [80, 'El nombre no puede superar 80 caracteres'],
    },
    // Foto de perfil: imagen pequeña (256 px) como data URL. Se guarda con el usuario
    // para que entre en las copias de seguridad y se vea sin conexión.
    foto: { type: String, maxlength: 200_000 },
    // Horas de estudio disponibles por defecto al generar planes.
    horasEstudioDiarias: { type: Number, min: 0, max: 16, default: 3 },
    // Qué avisos recibe y cuándo (la hora es la de su zona horaria).
    notificaciones: {
      examenes: { type: Boolean, default: true },
      planDiario: { type: Boolean, default: true },
      retraso: { type: Boolean, default: true },
      logros: { type: Boolean, default: true },
      horaDiaria: { type: String, default: '08:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
      zonaHoraria: { type: String, default: 'Europe/Madrid', maxlength: 60 },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model('User', userSchema);
