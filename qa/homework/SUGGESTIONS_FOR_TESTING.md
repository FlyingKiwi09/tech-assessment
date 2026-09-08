| Observation                                   | Impact On Testing                                 | Suggested Fix                                                                           |
| --------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| no Id available for booking when it's created | can't verify exact booking on sessions page       | data-id should be available when booking a session (either on the screen or in the DOM) |
| some elements missing testId                  | less readible selectors and valnerable to changes | review and update elements with testIDs                                                 |
