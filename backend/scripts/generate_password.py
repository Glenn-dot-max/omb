import bcrypt

password = "Admin2026!"

hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
print(f"Hash bcrypt à copier dans Supabase :")
print(hashed.decode('utf-8'))