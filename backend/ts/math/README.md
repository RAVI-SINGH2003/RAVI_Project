# Description

This module detects display and inline maths in the document and outputs it in the JSON file of the document.

## Dependencies

Bbox, line, spans, parameters, canvas, page, dokument

## Input

1. Inferred bounding boxes from the model.
2. Document object.

## Output

spans of display maths inside `display_math_detected` key of document JSON.
spans of inline maths inside `inline_math_detected` key of document JSON.
`isLineDisplayMaths` flag of lines are set/unset in the document JSON if the line is a display maths.

## Owners

juyalshivansh3@gmail.com
sanjeevs6868@gmail.com