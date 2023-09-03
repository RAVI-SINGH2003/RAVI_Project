# Agglo

This is agglo NPM package which has been customized and stord as a part of project module.

# Third party package

agglo is a third-party package that has been customised for this project.
This package clusters background boxes heirarchically from bottom to top.

# Clustering algorithm

Hierarchical clustering algorithms group similar objects into groups called clusters with bottom up approach starting with many small clusters and merge them together to create bigger clusters.

# Reason for clustering

Agglo package returns one big cluster as a parent and other clusters as children. But project requires clustering of nearby background bounding boxes as per the distance between them. Level parameter can not be changed with the package, so this parameter is checked in the file.

# Files changed

1.  ```
    custom_index.js
    ```
2.  ```
    lib\custom_cluster.js
    ```
