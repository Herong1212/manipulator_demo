/**
 * transform.js — 齐次坐标变换矩阵核心库
 *
 * 约定：
 *   - 矩阵用一维数组表示，行主序（row-major），长度 16
 *   - M[i][j] 对应索引 i*4+j
 *   - 与 Three.js 的 Matrix4 列主序不同，本库内部使用行主序
 *     上传给 Three.js 时调用 toThreeMatrix4() 做转置
 *
 * 旋转约定：
 *   - 外旋 XYZ（固定轴）= 内旋 ZYX（动轴）
 *   - 旋转顺序：T = Rz · Ry · Rx · T_trans
 *   - 右手坐标系
 */

'use strict';

// ═══════════════════════════════════════════════════════
//  工具函数
// ═══════════════════════════════════════════════════════

/**
 * 角度转弧度
 * @param {number} deg
 * @returns {number}
 */
function deg2rad(deg) {
    return (deg * Math.PI) / 180.0;
}

/**
 * 弧度转角度
 * @param {number} rad
 * @returns {number}
 */
function rad2deg(rad) {
    return (rad * 180.0) / Math.PI;
}

/**
 * 四舍五入到指定小数位（消除浮点误差）
 * @param {number} v
 * @param {number} digits
 * @returns {number}
 */
function roundTo(v, digits = 6) {
    const factor = Math.pow(10, digits);
    return Math.round(v * factor) / factor;
}

// ═══════════════════════════════════════════════════════
//  4×4 矩阵基本操作（行主序，一维数组，长度 16）
// ═══════════════════════════════════════════════════════

const Mat4 = {

    /**
     * 创建单位矩阵
     * @returns {Float64Array} 长度 16
     */
    identity() {
        // prettier-ignore
        return new Float64Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ]);
    },

    /**
     * 从二维数组创建矩阵
     * @param {number[][]} arr  4×4 二维数组
     * @returns {Float64Array}
     */
    fromArray(arr) {
        const m = new Float64Array(16);
        for (let i = 0; i < 4; i++)
            for (let j = 0; j < 4; j++)
                m[i * 4 + j] = arr[i][j];
        return m;
    },

    /**
     * 转为二维数组（方便显示）
     * @param {Float64Array} m
     * @returns {number[][]}
     */
    toArray2D(m) {
        const result = [];
        for (let i = 0; i < 4; i++) {
            result.push([m[i*4], m[i*4+1], m[i*4+2], m[i*4+3]]);
        }
        return result;
    },

    /**
     * 4×4 矩阵乘法：C = A · B
     * @param {Float64Array} A
     * @param {Float64Array} B
     * @returns {Float64Array}
     */
    mul(A, B) {
        const C = new Float64Array(16);
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                let sum = 0;
                for (let k = 0; k < 4; k++) {
                    sum += A[i * 4 + k] * B[k * 4 + j];
                }
                C[i * 4 + j] = sum;
            }
        }
        return C;
    },

    /**
     * 矩阵转置
     * @param {Float64Array} m
     * @returns {Float64Array}
     */
    transpose(m) {
        const t = new Float64Array(16);
        for (let i = 0; i < 4; i++)
            for (let j = 0; j < 4; j++)
                t[j * 4 + i] = m[i * 4 + j];
        return t;
    },

    /**
     * 齐次变换矩阵的逆矩阵
     *
     * 对于标准齐次变换矩阵 T = [R | t; 0 0 0 1]，其逆为：
     *   T⁻¹ = [Rᵀ | -Rᵀ·t; 0 0 0 1]
     *
     * 比通用高斯消元法更高效、更稳定。
     *
     * @param {Float64Array} T  4×4 齐次变换矩阵
     * @returns {Float64Array}
     */
    invertHomogeneous(T) {
        // 提取旋转子矩阵 R（左上 3×3）
        const Rt = new Float64Array(16); // 存放 Rᵀ
        for (let i = 0; i < 3; i++)
            for (let j = 0; j < 3; j++)
                Rt[i * 4 + j] = T[j * 4 + i]; // 转置

        // 提取平移向量 t
        const tx = T[3], ty = T[7], tz = T[11];

        // 计算 -Rᵀ·t
        const ntx = -(Rt[0]*tx + Rt[1]*ty + Rt[2]*tz);
        const nty = -(Rt[4]*tx + Rt[5]*ty + Rt[6]*tz);
        const ntz = -(Rt[8]*tx + Rt[9]*ty + Rt[10]*tz);

        Rt[3]  = ntx;
        Rt[7]  = nty;
        Rt[11] = ntz;
        Rt[12] = 0; Rt[13] = 0; Rt[14] = 0; Rt[15] = 1;
        return Rt;
    },

    /**
     * 将本库的行主序矩阵转换为 Three.js Matrix4（列主序）
     * @param {Float64Array} m
     * @returns {THREE.Matrix4}
     */
    toThreeMatrix4(m) {
        const t = new THREE.Matrix4();
        // Three.js Matrix4.set 接受行主序参数
        t.set(
            m[0],  m[1],  m[2],  m[3],
            m[4],  m[5],  m[6],  m[7],
            m[8],  m[9],  m[10], m[11],
            m[12], m[13], m[14], m[15]
        );
        return t;
    },

    /**
     * 对 4D 齐次向量施加变换：v' = M · v
     * @param {Float64Array} M  4×4 矩阵（行主序）
     * @param {number[]} v      长度为 4 的向量 [x, y, z, w]
     * @returns {number[]}      变换后的 [x', y', z', w']
     */
    mulVec4(M, v) {
        const result = [0, 0, 0, 0];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                result[i] += M[i * 4 + j] * v[j];
            }
        }
        return result;
    },

    /**
     * 对 3D 点施加齐次变换（w=1）
     * @param {Float64Array} M
     * @param {number[]} p  [x, y, z]
     * @returns {number[]}  [x', y', z']
     */
    mulPoint(M, p) {
        const v = Mat4.mulVec4(M, [p[0], p[1], p[2], 1.0]);
        return [v[0] / v[3], v[1] / v[3], v[2] / v[3]];
    },

    /**
     * 对 3D 向量施加齐次变换（w=0，不受平移影响）
     * @param {Float64Array} M
     * @param {number[]} d  [dx, dy, dz]
     * @returns {number[]}  [dx', dy', dz']
     */
    mulDir(M, d) {
        const v = Mat4.mulVec4(M, [d[0], d[1], d[2], 0.0]);
        return [v[0], v[1], v[2]];
    },

    /**
     * 将矩阵元素四舍五入（消除微小浮点误差，用于显示）
     * @param {Float64Array} m
     * @param {number} digits
     * @returns {Float64Array}
     */
    round(m, digits = 4) {
        const r = new Float64Array(16);
        const factor = Math.pow(10, digits);
        for (let i = 0; i < 16; i++) {
            r[i] = Math.round(m[i] * factor) / factor;
        }
        return r;
    },
};

// ═══════════════════════════════════════════════════════
//  基本变换矩阵构造函数
// ═══════════════════════════════════════════════════════

const Transform = {

    // ────────────────────────────────────────
    //  平移矩阵
    //
    //  T(tx, ty, tz) =
    //  ┌ 1  0  0  tx ┐
    //  │ 0  1  0  ty │
    //  │ 0  0  1  tz │
    //  └ 0  0  0   1 ┘
    // ────────────────────────────────────────
    translation(tx, ty, tz) {
        const m = Mat4.identity();
        m[3]  = tx;
        m[7]  = ty;
        m[11] = tz;
        return m;
    },

    // ────────────────────────────────────────
    //  绕 X 轴旋转矩阵（右手定则）
    //
    //  Rx(θ) =
    //  ┌ 1   0    0   0 ┐
    //  │ 0  cosθ -sinθ 0 │
    //  │ 0  sinθ  cosθ 0 │
    //  └ 0   0    0   1 ┘
    // ────────────────────────────────────────
    rotX(rad) {
        const c = Math.cos(rad), s = Math.sin(rad);
        const m = Mat4.identity();
        m[5]  =  c;  m[6]  = -s;
        m[9]  =  s;  m[10] =  c;
        return m;
    },

    // ────────────────────────────────────────
    //  绕 Y 轴旋转矩阵（右手定则）
    //
    //  Ry(θ) =
    //  ┌  cosθ  0  sinθ  0 ┐
    //  │   0    1   0    0 │
    //  │ -sinθ  0  cosθ  0 │
    //  └   0    0   0    1 ┘
    // ────────────────────────────────────────
    rotY(rad) {
        const c = Math.cos(rad), s = Math.sin(rad);
        const m = Mat4.identity();
        m[0]  =  c;  m[2]  =  s;
        m[8]  = -s;  m[10] =  c;
        return m;
    },

    // ────────────────────────────────────────
    //  绕 Z 轴旋转矩阵（右手定则）
    //
    //  Rz(θ) =
    //  ┌ cosθ -sinθ  0  0 ┐
    //  │ sinθ  cosθ  0  0 │
    //  │  0     0    1  0 │
    //  └  0     0    0  1 ┘
    // ────────────────────────────────────────
    rotZ(rad) {
        const c = Math.cos(rad), s = Math.sin(rad);
        const m = Mat4.identity();
        m[0]  =  c;  m[1]  = -s;
        m[4]  =  s;  m[5]  =  c;
        return m;
    },

    // ────────────────────────────────────────
    //  绕任意轴旋转（Rodrigues 公式）
    //
    //  R = I·cosθ + (1-cosθ)(n⊗n) + sinθ·[n]×
    //  其中 n 为单位轴向量，[n]× 为反对称矩阵
    // ────────────────────────────────────────
    rotAxis(nx, ny, nz, rad) {
        // 归一化轴
        const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
        if (len < 1e-10) return Mat4.identity();
        nx /= len; ny /= len; nz /= len;

        const c = Math.cos(rad), s = Math.sin(rad), t = 1 - c;
        const m = Mat4.identity();
        m[0]  = t*nx*nx + c;      m[1]  = t*nx*ny - s*nz; m[2]  = t*nx*nz + s*ny;
        m[4]  = t*nx*ny + s*nz;   m[5]  = t*ny*ny + c;    m[6]  = t*ny*nz - s*nx;
        m[8]  = t*nx*nz - s*ny;   m[9]  = t*ny*nz + s*nx; m[10] = t*nz*nz + c;
        return m;
    },

    // ────────────────────────────────────────
    //  完整齐次变换矩阵（旋转 + 平移）
    //
    //  T = [R | t]  =  Rz · Ry · Rx · T_trans
    //      [0 | 1]
    //
    //  旋转约定：外旋 XYZ（固定轴），即先绕 X 转，再绕 Y 转，再绕 Z 转
    //  等价于内旋 ZYX（动轴顺序 Z→Y→X）
    // ────────────────────────────────────────
    compose(tx, ty, tz, rx_deg, ry_deg, rz_deg) {
        const rx = deg2rad(rx_deg);
        const ry = deg2rad(ry_deg);
        const rz = deg2rad(rz_deg);

        const Rx = Transform.rotX(rx);
        const Ry = Transform.rotY(ry);
        const Rz = Transform.rotZ(rz);
        const Tmat = Transform.translation(tx, ty, tz);

        // R = Rz · Ry · Rx
        const R = Mat4.mul(Rz, Mat4.mul(Ry, Rx));

        // T_full = R · Tmat（先平移再旋转，即旋转矩阵写入平移列）
        // 实际上齐次变换 T = [R | t; 0 0 0 1]，平移就是 t
        // 这里直接组合：先旋转后平移
        const T = new Float64Array(R);
        T[3]  = tx;
        T[7]  = ty;
        T[11] = tz;
        return T;
    },

    // ────────────────────────────────────────
    //  从 4×4 齐次矩阵提取欧拉角（ZYX 内旋）
    //  返回角度（度）
    // ────────────────────────────────────────
    extractEulerZYX(T) {
        // 提取旋转子矩阵元素
        const r00 = T[0], r01 = T[1], r02 = T[2];
        const r10 = T[4], r11 = T[5], r12 = T[6];
        const r20 = T[8], r21 = T[9], r22 = T[10];

        let ry, rx, rz;
        const sy = Math.sqrt(r00*r00 + r10*r10);

        if (sy > 1e-6) {
            rz = Math.atan2(r10, r00);
            ry = Math.atan2(-r20, sy);
            rx = Math.atan2(r21, r22);
        } else {
            // 万向锁情况
            rz = Math.atan2(-r01, r11);
            ry = Math.atan2(-r20, sy);
            rx = 0;
        }
        return {
            rx: rad2deg(rx),
            ry: rad2deg(ry),
            rz: rad2deg(rz),
        };
    },

    // ────────────────────────────────────────
    //  从 4×4 齐次矩阵提取平移量
    // ────────────────────────────────────────
    extractTranslation(T) {
        return { tx: T[3], ty: T[7], tz: T[11] };
    },
};

// ═══════════════════════════════════════════════════════
//  点坐标变换演示（用于 UI 中的"点变换"板块）
// ═══════════════════════════════════════════════════════

const PointTransform = {
    /**
     * 将一个点从机械臂末端坐标系变换到世界坐标系
     * @param {number[]} pointInEE   末端坐标系中的点 [x, y, z]
     * @param {Float64Array} T_world_ee  世界→末端的变换矩阵
     * @returns {number[]}  世界坐标系中的点 [x, y, z]
     */
    endEffectorToWorld(pointInEE, T_world_ee) {
        return Mat4.mulPoint(T_world_ee, pointInEE);
    },

    /**
     * 将一个点从世界坐标系变换到机械臂末端坐标系
     */
    worldToEndEffector(pointInWorld, T_world_ee) {
        const T_inv = Mat4.invertHomogeneous(T_world_ee);
        return Mat4.mulPoint(T_inv, pointInWorld);
    },
};

// ═══════════════════════════════════════════════════════
//  导出（全局变量，供 main.js 使用）
// ═══════════════════════════════════════════════════════
window.Mat4 = Mat4;
window.Transform = Transform;
window.PointTransform = PointTransform;
window.deg2rad = deg2rad;
window.rad2deg = rad2deg;
