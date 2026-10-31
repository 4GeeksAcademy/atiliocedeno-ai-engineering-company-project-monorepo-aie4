"""Show HealthCore accounts/profiles and provision the initial administrator.

Run from services/healthcore-api with:
    python -m scripts.manage_admin

This is a local operator tool. It never prints password hashes or secrets.
"""

from __future__ import annotations

import getpass
import argparse
import sys
from pathlib import Path

# Support direct module/script execution from the service directory.
SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.models.user import UserRole
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserUpdate
from app.services.user_service import UserService


def show_users_and_profiles(service: UserService) -> None:
    users = service.list_users()
    print(f"\nCuentas registradas: {len(users)}")
    print("-" * 72)
    if not users:
        print("No hay usuarios todavía.")
    for user in users:
        status = "activa" if user.is_active else "inactiva"
        print(f"ID {user.id} | {user.email} | rol: {user.role.value} | {status}")
        profile = service.get_profile(user.id or 0)
        if profile is None:
            print("  Perfil: sin crear")
        else:
            print(f"  Nombre: {profile.name or '—'}")
            print(f"  Teléfono: {profile.phone or '—'}")
            print(f"  Dirección: {profile.address or '—'}")
    print("-" * 72)


def prompt_password() -> str:
    while True:
        password = getpass.getpass("Contraseña nueva para el administrador (mínimo 12 caracteres): ")
        confirmation = getpass.getpass("Confirma la contraseña: ")
        if password != confirmation:
            print("Las contraseñas no coinciden. Inténtalo de nuevo.")
            continue
        if len(password) < 12:
            print("La contraseña debe tener al menos 12 caracteres.")
            continue
        if len(password) > 128:
            print("La contraseña no puede superar 128 caracteres.")
            continue
        return password


def main() -> int:
    parser = argparse.ArgumentParser(
        description="List HealthCore users/profiles and provision the initial administrator."
    )
    parser.parse_args()

    service = UserService()
    show_users_and_profiles(service)

    users = service.list_users()
    if any(user.role == UserRole.ADMIN for user in users):
        print("Ya existe una cuenta administradora. No se creó ni modificó ninguna credencial.")
        print("Usa la sección de administración del portal para gestionar usuarios y perfiles.")
        return 0

    print("\nNo existe un administrador todavía.")
    email = input("Correo para la cuenta administradora: ").strip().lower()
    password = prompt_password()
    repository = UserRepository()
    existing = repository.get_by_email(email)

    if existing is not None:
        confirmation = input(
            f"El correo pertenece a {existing.email} (ID {existing.id}). "
            "¿Promover esa cuenta a admin y reemplazar su contraseña? Escribe 'si' para confirmar: "
        ).strip().lower()
        if confirmation != "si":
            print("Operación cancelada; no se realizaron cambios.")
            return 1
        service.update_user(
            existing.id or 0,
            UserUpdate(password=password),
            role=UserRole.ADMIN,
            is_active=True,
        )
        print(f"La cuenta {existing.email} ahora tiene rol admin y una contraseña nueva.")
        return 0

    try:
        service.bootstrap_admin(email, password)
    except (ValueError, RuntimeError) as exc:
        print(f"No se pudo crear la cuenta administradora: {exc}", file=sys.stderr)
        return 1
    print(f"Cuenta administradora creada para {email}.")
    print("Inicia sesión en el portal y administra las demás cuentas y perfiles desde allí.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
