import os
from pathlib import Path

ENV_PATH = Path(__file__).parent / '.env'
KEY = 'DB_PASSWORD'
NEW_VALUE = os.environ.get('NEW_DB_PASSWORD') or 'CHANGE_ME'


def load_env_lines(path: Path):
    if not path.exists():
        return []
    with path.open('r', encoding='utf-8') as f:
        return f.readlines()


def write_env_lines(path: Path, lines):
    with path.open('w', encoding='utf-8') as f:
        f.writelines(lines)


def set_key(lines, key, value):
    updated = False
    out = []
    for line in lines:
        if line.strip().startswith(f'{key}='):
            out.append(f'{key}={value}\n')
            updated = True
        else:
            out.append(line)
    if not updated:
        out.append(f'{key}={value}\n')
    return out, updated


def main():
    lines = load_env_lines(ENV_PATH)
    new_lines, existed = set_key(lines, KEY, NEW_VALUE)
    write_env_lines(ENV_PATH, new_lines)
    print(f"{'Updated' if existed else 'Added'} {KEY} in {ENV_PATH}")


if __name__ == '__main__':
    main()
