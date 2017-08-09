#!/bin/bash

imagemagick compare -metric RMSE examples/graph2d/01_basic-live.png examples/graph2d/01_basic-local.png NULL:
