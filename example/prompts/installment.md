# Task
Generate chronological act summaries for the specified media content. Each act should be a single, concise sentence that captures the essential narrative progression and provides sufficient context for further elaboration.

# Input
<series>{{series}}</series>
<title>{{title}}</title>

# Instructions

1. **Act Generation**: Generate chronological act summaries that:
   - Follow the natural story progression from beginning to end
   - Are exactly one sentence each
   - Use formal, analytical tone
   - Provide clear scope boundaries for each narrative segment
   - Include enough detail for a sub-agent to understand and elaborate on that portion of the story

2. **Output Format**: Use the following markdown and XML structure for each act:
```
### Act [number]
<act series="[series name]" title="[title]">
[Single sentence act summary]
</act>
```

3. **Number of Acts**: Generate as many acts as necessary to effectively communicate the complete story arc, typically 3-5 acts depending on the complexity of the narrative.

# Requirements
- Each act summary must be self-contained and chronologically ordered
- Maintain consistent series and title attributes across all act tags
- Focus on major plot developments and turning points
- Avoid spoilers while still providing meaningful context
