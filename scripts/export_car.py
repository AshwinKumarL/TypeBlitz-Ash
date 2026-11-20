import bpy
import mathutils
import sys

# Deselect everything
bpy.ops.object.select_all(action='DESELECT')

car = bpy.data.objects.get('car')
tyre = bpy.data.objects.get('Tyre')
plane = bpy.data.objects.get('Plane')

if not car or not tyre:
    print("Error: car or Tyre not found!")
    sys.exit(1)

# Delete GameIsoCam
cam = bpy.data.objects.get('GameIsoCam')
if cam:
    bpy.data.objects.remove(cam, do_unlink=True)

# 1. Apply modifiers on Tyre while car is intact
bpy.context.view_layer.objects.active = tyre
tyre.select_set(True)
for mod in list(tyre.modifiers):
    bpy.ops.object.modifier_apply(modifier=mod.name)
tyre.select_set(False)

# 2. Apply modifiers on car
bpy.context.view_layer.objects.active = car
car.select_set(True)
for mod in list(car.modifiers):
    bpy.ops.object.modifier_apply(modifier=mod.name)

# Join plate into car
if plane:
    plane.select_set(True)
    bpy.ops.object.join()

car.name = "Car_Body"
car.select_set(False)

# 3. Now apply transforms so vertex data is baked in world space
for obj in [car, tyre]:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.select_set(False)

# 4. Separate tyre into 4 individual wheels
bpy.context.view_layer.objects.active = tyre
tyre.select_set(True)
bpy.ops.mesh.separate(type='LOOSE')
wheel_objs = list(bpy.context.selected_objects)
print(f"Separated wheels count: {len(wheel_objs)}")

wheels = []
for w in wheel_objs:
    bpy.context.view_layer.objects.active = w
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    wheels.append(w)

for w in wheels:
    loc = w.location
    is_front = loc.y < 0
    is_left = loc.x < 0
    if is_front and is_left:
        w.name = "Wheel_FL"
    elif is_front and not is_left:
        w.name = "Wheel_FR"
    elif not is_front and is_left:
        w.name = "Wheel_RL"
    else:
        w.name = "Wheel_RR"
    print(f"Named wheel: {w.name} at {loc.x:.3f}, {loc.y:.3f}, {loc.z:.3f}")

# 5. Set car body origin
bpy.context.view_layer.objects.active = car
car.select_set(True)
bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
car.select_set(False)

# 6. Materials enhancements
for mat in bpy.data.materials:
    if not mat.node_tree:
        continue
    for node in mat.node_tree.nodes:
        if node.type == 'BSDF_PRINCIPLED':
            if mat.name == 'Light-White':
                if 'Emission Color' in node.inputs:
                    node.inputs['Emission Color'].default_value = (1.0, 1.0, 0.9, 1.0)
                    node.inputs['Emission Strength'].default_value = 5.0
            elif mat.name == 'Light-red':
                if 'Emission Color' in node.inputs:
                    node.inputs['Emission Color'].default_value = (1.0, 0.05, 0.05, 1.0)
                    node.inputs['Emission Strength'].default_value = 4.0
            elif mat.name == 'Glass':
                node.inputs['Roughness'].default_value = 0.1
                node.inputs['Metallic'].default_value = 0.2
                if 'Alpha' in node.inputs:
                    node.inputs['Alpha'].default_value = 0.7
            elif mat.name == 'Body':
                node.inputs['Base Color'].default_value = (0.05, 0.42, 0.95, 1.0)
                node.inputs['Roughness'].default_value = 0.3
                node.inputs['Metallic'].default_value = 0.3
            elif mat.name == 'Metal-Steel':
                node.inputs['Metallic'].default_value = 0.9
                node.inputs['Roughness'].default_value = 0.2
            elif mat.name == 'Tyre':
                node.inputs['Base Color'].default_value = (0.08, 0.08, 0.08, 1.0)
                node.inputs['Roughness'].default_value = 0.85

# 7. Parent all to Root
root = bpy.data.objects.new("Car_Root", None)
bpy.context.scene.collection.objects.link(root)
root.location = (0, 0, 0)
root.rotation_euler = (0, 0, 0)

for obj in [car] + wheels:
    obj.parent = root
    obj.matrix_parent_inverse = root.matrix_world.inverted()

# Export GLB
output_path = r"c:\Users\Ashwin Kumar L\Desktop\lowplytypedriver\public\models\ford_anglia.glb"
bpy.ops.object.select_all(action='DESELECT')
root.select_set(True)
for obj in [car] + wheels:
    obj.select_set(True)

bpy.context.view_layer.objects.active = root

bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    use_selection=True,
    export_apply=False
)
print("Successfully exported Ford Anglia GLB to:", output_path)
