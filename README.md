# DH Viewer - URDF & MDH Parameters Viewer

DH Viewer是一个用于可视化和分析机器人URDF文件的工具，支持查看3D模型、控制关节角度、显示MDH参数等功能。

## 功能特点

- 🤖 **URDF文件可视化**: 加载并显示机器人的3D模型
- 🎛️ **关节控制**: 通过滑块或输入值控制关节角度
- 📐 **MDH参数**: 查看和显示Modified Denavit-Hartenberg参数
- 🔄 **运动学分析**: 支持正运动学和雅可比矩阵计算
- ✏️ **URDF编辑**: 内置XML编辑器，支持直接编辑URDF文件
- 🎨 **可视化控制**: 支持透明度调节、坐标系显示等
- 📊 **碰撞体处理**: 支持碰撞体网格分解和显示

## 系统要求

- Python 3.7+
- Linux/Windows/macOS
- 显卡支持OpenGL（用于3D渲染）

## 安装步骤

### 1. 克隆或下载项目

```bash
git clone https://github.com/Herong1212/manipulator_demo.git
cd dh_viewer
```

### 2. 创建Conda环境

```bash
# 创建名为dh_viewer的conda环境，指定Python版本
conda create -n dh_viewer python=3.8 -y

# 激活环境
conda activate dh_viewer
```

### 3. 安装依赖包

```bash
# 安装基础依赖
pip install -r requirements.txt

# 安装GUI和可视化依赖
pip install PyQt5 vtk numpy
```

### 4. 验证安装

```bash
# 检查Python版本
python --version

# 检查关键包是否安装成功
python -c "import PyQt5; import vtk; import numpy; print('依赖包安装成功！')"
```

## 使用方法

### 基本使用

1. **启动程序**:
   ```bash
   python dh_viewer.py
   ```

2. **打开URDF文件**:
   - 点击"Open URDF"按钮选择URDF文件
   - 或者直接将URDF文件拖拽到3D视图中

3. **控制关节角度**:
   - 使用右侧的滑块调节每个关节的角度
   - 点击"Reset"按钮重置所有关节到零位置
   - 点击"Random"按钮随机设置关节角度
   - 点击"Set Joints"按钮批量输入关节角度值

4. **选择运动链**:
   - 在左侧"Select Chain"下拉框中选择要查看的运动链
   - 在"Links"列表中查看和选择连杆

5. **查看MDH参数**:
   - 点击"Show MDH Parameters"按钮查看当前运动链的MDH参数表
   - 勾选"Show MDH Frames"在3D视图中显示MDH坐标系

6. **调整显示**:
   - 使用"Transparency"滑块调节模型透明度
   - 勾选/取消"Show Link Frames"显示/隐藏连杆坐标系
   - 勾选/取消"Show Collision"显示/隐藏碰撞体

### 高级功能

#### URDF文件编辑

1. 点击"Edit URDF"按钮打开XML编辑器
2. 在编辑器中修改URDF内容
3. 点击"Apply"保存更改并更新3D模型

#### 碰撞体网格分解

1. 点击"Decompose As Collision"按钮
2. 在弹出的对话框中选择分解参数
3. 应用后URDF文件将自动更新

#### 单位切换

- 在右侧"Joints Control"面板中，可以在"rad"（弧度）和"deg"（度）之间切换显示单位

## 示例文件

项目包含一个示例机器人模型：

- `descriptions/tcb610_06N/urdf/TCB610_06N.urdf` - TCB610机器人的URDF文件
- `descriptions/tcb610_06N/meshes/` - 对应的3D网格文件（STL格式）

加载示例：
```bash
python dh_viewer.py
# 然后选择 descriptions/tcb610_06N/urdf/TCB610_06N.urdf
```

## 项目结构

```
dh_viewer/
├── dh_viewer.py              # 主程序入口
├── urdf_parser.py            # URDF文件解析器
├── urdf_vtk_model.py         # VTK 3D模型渲染
├── xml_editor.py             # XML编辑器
├── mdh_dialog.py             # MDH参数显示对话框
├── decomp_dialog.py          # 碰撞体分解对话框
├── simplify_mesh.py          # 网格简化工具
├── requirements.txt          # Python依赖包
├── codegen/                  # 代码生成模块
│   ├── forward_kinematics.py # 正运动学
│   ├── jacobian.py           # 雅可比矩阵
│   └── sympybotics/          # 符号计算库
├── descriptions/             # 机器人描述文件
│   └── tcb610_06N/          # 示例机器人
│       ├── urdf/            # URDF文件
│       └── meshes/          # 3D网格文件
└── third_parties/            # 第三方工具
    ├── urdf2dh.py           # URDF转DH参数
    └── ...
```

## 依赖包说明

- **PyQt5**: GUI框架，用于创建用户界面
- **VTK**: 3D可视化库，用于渲染机器人模型
- **numpy**: 数值计算库
- **anytree**: 树形数据结构，用于运动链分析
- **trimesh**: 网格处理库
- **transformations**: 坐标变换库

## 常见问题

### Q: 启动时提示找不到PyQt5或VTK？
A: 确保已激活conda环境并安装了所有依赖：
```bash
conda activate dh_viewer
pip install PyQt5 vtk
```

### Q: 3D视图显示不正常或卡顿？
A: 检查显卡驱动是否支持OpenGL，尝试降低网格复杂度或更新显卡驱动。

### Q: 加载URDF文件时提示找不到mesh文件？
A: 确保mesh文件路径正确，相对路径是相对于URDF文件所在目录的。

### Q: 如何导出MDH参数？
A: 点击"Show MDH Parameters"后，参数表格会显示在弹出的对话框中，可以手动复制。

## 开发者信息

- 项目地址: https://github.com/Herong1212/manipulator_demo
- 主要功能: URDF可视化、运动学分析、MDH参数计算
