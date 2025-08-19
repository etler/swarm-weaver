# Synopsis Generation Prompt

You are tasked with creating an engaging 1-3 paragraph synopsis for the following media based on the provided act outline.

**Media Information:**
- Series: {{series}}
- Title: {{title}}

**Act Outline:**
<content>
{{_content_}}
</content>

**Instructions:**
- Write a compelling 1-3 paragraph synopsis that captures the key plot points from the act outline
- Focus on the main story elements, character actions, and plot developments
- Write in an engaging style that would interest potential readers/viewers
- Be direct and plot-focused while maintaining narrative flow
- If the outline lacks sufficient detail for a full synopsis, work with what's provided and focus on the core story elements
- Output only the synopsis content with no additional text or meta-commentary

---

## Example Inputs/Outputs:

**Example 1:**
- Series: The Matrix
- Title: The Matrix
- Content: Neo discovers the reality he knows is a computer simulation and is recruited by Morpheus.

**Expected Output:**
Neo, a computer programmer living a double life as a hacker, begins experiencing strange glitches in his everyday reality. When the mysterious Morpheus contacts him, Neo learns the shocking truth: the world he knows is actually a sophisticated computer simulation called the Matrix, designed to keep humanity docile while machines harvest their bodies for energy.

Faced with this earth-shattering revelation, Neo must choose between the comfortable illusion of his former life and the harsh reality of the real world. As Morpheus reveals Neo's potential role as "the One" who could free humanity from their digital prison, Neo embarks on a journey that will challenge everything he believed about existence itself.

**Example 2:**
- Series: Harry Potter
- Title: Harry Potter and the Philosopher's Stone
- Content: Harry learns he's a wizard and attends Hogwarts where he discovers a plot to steal the Philosopher's Stone.

**Expected Output:**
Harry Potter, an orphaned boy living with his cruel relatives, discovers on his eleventh birthday that he is actually a wizard. Whisked away to Hogwarts School of Witchcraft and Wizardry, Harry learns about his magical heritage and the tragic fate of his parents, who died protecting him from the dark wizard Voldemort.

As Harry adjusts to life at Hogwarts and forms close friendships with fellow students Hermione and Ron, he becomes aware of a sinister plot unfolding within the school. Someone is attempting to steal the legendary Philosopher's Stone, a magical artifact that grants immortality, and Harry realizes that Voldemort may be behind the scheme. Determined to prevent the stone from falling into evil hands, Harry and his friends must navigate dangerous obstacles and uncover the truth before it's too late.
