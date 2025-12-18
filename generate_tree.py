
import os

def generate_tree(file_path, output_path):
    files = []
    try:
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            files = [line.strip() for line in f if line.strip()]
    except Exception as e:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(f"Error reading input: {e}")
        return

    tree = {}
    for path in files:
        parts = path.split('/')
        current = tree
        for part in parts:
            current = current.setdefault(part, {})

    with open(output_path, 'w', encoding='utf-8') as f:
        def print_tree(node, prefix=''):
            keys = sorted(node.keys())
            for i, key in enumerate(keys):
                is_last = i == len(keys) - 1
                connector = '└── ' if is_last else '├── '
                f.write(prefix + connector + key + '\n')
                
                extension = '    ' if is_last else '│   '
                if node[key]:
                    print_tree(node[key], prefix + extension)

        print_tree(tree)

if __name__ == '__main__':
    generate_tree('temp_file_list.txt', 'project_tree.txt')
