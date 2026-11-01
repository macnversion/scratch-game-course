# -*- coding: utf-8 -*-
"""
生成素材包：从 assets/sprites/<游戏>/ 的 SVG 造型，
打包成 Scratch 标准 .sprite3（角色区 ⊕ 上传角色 一步导入）。

目录约定：
  assets/sprites/公用/    —— 多游戏共用的造型（如：子弹）
  assets/sprites/<游戏>/  —— 各游戏专属造型
  示例项目/素材包/<游戏>/  —— 输出：每角色一个 .sprite3（多造型合一）

改完素材后重跑：python3 示例项目/生成素材包.py
"""
import json, zipfile, io, hashlib, re, pathlib, shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
SP = ROOT / 'assets' / 'sprites'
OUT = ROOT / '示例项目' / '素材包'

# 每游戏的背景（随包分发的 svg 文件，「选择一个背景 → 上传」导入）
BACKGROUNDS = {'打砖块': '星空夜景', '太空射击': '深空星域', '飞扬小鸟': '白日晴空',
               '贪吃蛇': '苔原格阵', '俄罗斯方块': '霓虹网格', '塔防': '荒漠要道',
               '跳跳冒险': '草原晨光', '坦克大战': '沙场阵地'}

# 每游戏要打包的角色：角色名 → [(svg 名, 造型名), …]
PACKS = {
    '打砖块': {
        '挡板': [('挡板', '挡板')],
        '球':   [('球', '球')],
        '砖块': [('砖块-红', '砖块-红'), ('砖块-橙', '砖块-橙'), ('砖块-绿', '砖块-绿'), ('砖块-蓝', '砖块-蓝')],
    },
    '太空射击': {
        '飞船': [('飞船', '飞船')],
        '陨石': [('陨石', '陨石')],
        '子弹': [('子弹', '子弹')],          # 公用
    },
    '飞扬小鸟': {
        '小鸟': [('小鸟', '小鸟')],
        '管道': [('管道', '管道')],
    },
    '贪吃蛇': {
        '蛇头': [('蛇头', '蛇头')],
        '蛇身': [('蛇身', '蛇身')],
        '食物': [('食物', '食物')],
    },
    '俄罗斯方块': {
        '单格方块': [('方块-青', '方块-青'), ('方块-黄', '方块-黄'), ('方块-紫', '方块-紫'),
                  ('方块-绿', '方块-绿'), ('方块-红', '方块-红'), ('方块-蓝', '方块-蓝'), ('方块-橙', '方块-橙')],
    },
    '塔防': {
        '敌人': [('敌人', '敌人')],
        '炮塔': [('炮塔', '炮塔')],
        '子弹': [('子弹', '子弹')],          # 公用
        '基地': [('基地', '基地')],
        '金币': [('金币', '金币')],          # 公用（跳跳冒险也用）
    },
    '跳跳冒险': {
        '小勇者': [('小勇者-站', '站'), ('小勇者-跑1', '跑1'), ('小勇者-跑2', '跑2')],
        '蘑菇敌': [('蘑菇敌-走1', '走1'), ('蘑菇敌-走2', '走2')],
        '地面砖': [('地面砖', '地面砖')],
        '问号砖': [('问号砖', '满'), ('铁砖', '空')],   # 顶完换"空"的铁砖造型
        '金币': [('金币', '金币')],          # 公用
        '终点旗': [('终点旗', '终点旗')],
    },
    '坦克大战': {
        '坦克-绿': [('坦克-绿-上', '上'), ('坦克-绿-右', '右'), ('坦克-绿-下', '下'), ('坦克-绿-左', '左')],
        '坦克-蓝': [('坦克-蓝-上', '上'), ('坦克-蓝-右', '右'), ('坦克-蓝-下', '下'), ('坦克-蓝-左', '左')],
        '子弹': [('子弹', '子弹')],          # 公用
        '土墙': [('土墙', '土墙')],
        '钢墙': [('钢墙', '钢墙')],
        '爆炸': [('爆炸-1', '炸1'), ('爆炸-2', '炸2')],
    },
}

def find_svg(name):
    """按 公用/ → 各游戏目录 的顺序找造型文件"""
    for d in ['公用'] + [p.name for p in sorted(SP.iterdir()) if p.is_dir() and p.name != '公用']:
        f = SP / d / f'{name}.svg'
        if f.exists():
            return f
    raise SystemExit(f'找不到造型: {name}.svg（assets/sprites/ 各目录都没有）')

def pack(sprite_name, costumes_spec, out_dir):
    costumes = []
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        for svg_name, costume_name in costumes_spec:
            f = find_svg(svg_name)
            data = f.read_bytes()
            md5ext = hashlib.md5(data).hexdigest() + '.svg'
            vb = re.search(r'viewBox="0 0 (\d+) (\d+)"', f.read_text(encoding='utf-8'))
            costumes.append({'name': costume_name, 'bitmapResolution': 1, 'md5ext': md5ext,
                             'dataFormat': 'svg',
                             'rotationCenterX': int(vb.group(1)) // 2,
                             'rotationCenterY': int(vb.group(2)) // 2})
            z.writestr(md5ext, data)
        sprite = {'name': sprite_name, 'isStage': False, 'x': 0, 'y': 0, 'size': 100,
                  'direction': 90, 'draggable': False, 'rotationStyle': "don't rotate",
                  'visible': True, 'costumes': costumes, 'currentCostume': 0}
        z.writestr('sprite.json', json.dumps(sprite, ensure_ascii=False))
    out = out_dir / f'{sprite_name}.sprite3'
    out.write_bytes(buf.getvalue())
    return [c['name'] for c in costumes]

def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    for game, sprites in PACKS.items():
        d = OUT / game
        d.mkdir(parents=True)
        bg = find_svg(BACKGROUNDS[game])
        shutil.copy(bg, d / f'背景-{game}.svg')
        print(f'  {game}/背景-{game}.svg')
        for sprite_name, spec in sprites.items():
            costumes = pack(sprite_name, spec, d)
            print(f'  {game}/{sprite_name}.sprite3 ← 造型 {costumes}')
    total = sum(len(v) for v in PACKS.values())
    print(f'素材包重建完成：{len(PACKS)} 个游戏目录 / {total} 个 .sprite3')

if __name__ == '__main__':
    main()
