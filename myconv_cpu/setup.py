from setuptools import setup
from torch.utils.cpp_extension import CppExtension, BuildExtension

setup(
    name='conv_ops',
    ext_modules=[
        CppExtension(
            name='conv_ops',
            sources=['conv.cpp']
        ),
    ],
    cmdclass={
        'build_ext': BuildExtension
    }
)
