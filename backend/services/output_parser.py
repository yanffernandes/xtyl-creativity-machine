"""
Output Parser Service

Parses structured outputs from AI responses (JSON, Markdown) into individual fields.
Enables granular variable access like {{node.title}} instead of just {{node.content}}.
"""

import json
import re
from typing import Dict, Any, Optional


class OutputParser:
    """Service for parsing structured AI outputs into individual fields"""

    def parse(self, content: str, output_format: str) -> Dict[str, Any]:
        """
        Parse AI output based on specified format.

        Args:
            content: Raw AI response text
            output_format: Format type ('text', 'json', or 'markdown')

        Returns:
            Dict with parsed fields. Always includes 'content' key with full text.

        Example:
            >>> parser = OutputParser()
            >>> output = parser.parse('{"title": "Hello", "body": "World"}', 'json')
            >>> print(output['title'])
            "Hello"
            >>> print(output['content'])  # Full original
            '{"title": "Hello", "body": "World"}'
        """
        # Always include full content
        result = {"content": content}

        if output_format == "json":
            parsed_fields = self.parse_json(content)
            result.update(parsed_fields)
        elif output_format == "markdown":
            parsed_fields = self.parse_markdown(content)
            result.update(parsed_fields)
        # For 'text' format, only 'content' field is available

        return result

    def parse_json(self, content: str) -> Dict[str, Any]:
        """
        Extract JSON from AI response and flatten to individual fields.

        Handles cases where AI wraps JSON in markdown code blocks or adds explanatory text.

        Args:
            content: AI response that may contain JSON

        Returns:
            Dict with extracted JSON fields (empty if no valid JSON found)

        Example:
            Input: 'Here is the data: {"title": "Summer Sale", "price": 99.99}'
            Output: {"title": "Summer Sale", "price": 99.99}

        Example (markdown wrapped):
            Input: '```json\n{"title": "Hello"}\n```'
            Output: {"title": "Hello"}
        """
        if not content:
            return {}

        try:
            # Try 1: Parse entire content as JSON
            return json.loads(content)
        except json.JSONDecodeError:
            pass

        try:
            # Try 2: Extract JSON from markdown code block
            json_block_match = re.search(
                r'```(?:json)?\s*\n(.*?)\n```',
                content,
                re.DOTALL | re.IGNORECASE
            )
            if json_block_match:
                json_str = json_block_match.group(1)
                return json.loads(json_str)
        except json.JSONDecodeError:
            pass

        try:
            # Try 3: Find first JSON object in text (between { and })
            json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', content, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                return json.loads(json_str)
        except json.JSONDecodeError:
            pass

        try:
            # Try 4: Find JSON array in text (between [ and ])
            json_array_match = re.search(r'\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\]', content, re.DOTALL)
            if json_array_match:
                json_str = json_array_match.group(0)
                parsed = json.loads(json_str)
                # Convert array to dict with index keys
                if isinstance(parsed, list):
                    return {f"item_{i}": item for i, item in enumerate(parsed)}
                return parsed
        except json.JSONDecodeError:
            pass

        # No valid JSON found - return empty dict
        return {}

    def parse_markdown(self, content: str) -> Dict[str, Any]:
        """
        Parse markdown headings into individual fields.

        Extracts content under each heading as a separate field.
        Field names are lowercase heading text with spaces replaced by underscores.

        Args:
            content: Markdown formatted text

        Returns:
            Dict mapping heading names to their content

        Example:
            Input:
            '''
            ## Title
            Summer Sale

            ## Description
            Hot deals this week

            ## Price
            $99.99
            '''

            Output: {
                "title": "Summer Sale",
                "description": "Hot deals this week",
                "price": "$99.99"
            }
        """
        if not content:
            return {}

        fields = {}

        # Pattern to match markdown headings (## Heading or # Heading)
        heading_pattern = re.compile(r'^(#{1,6})\s+(.+)$', re.MULTILINE)

        # Find all headings
        matches = list(heading_pattern.finditer(content))

        if not matches:
            return {}

        # Extract content between headings
        for i, match in enumerate(matches):
            heading_level = len(match.group(1))
            heading_text = match.group(2).strip()

            # Normalize field name (lowercase, replace spaces with underscores)
            field_name = heading_text.lower().replace(' ', '_').replace('-', '_')
            # Remove special characters
            field_name = re.sub(r'[^\w_]', '', field_name)

            # Find content between this heading and next heading
            start_pos = match.end()
            if i + 1 < len(matches):
                end_pos = matches[i + 1].start()
            else:
                end_pos = len(content)

            field_content = content[start_pos:end_pos].strip()

            fields[field_name] = field_content

        return fields

    def parse_text(self, content: str) -> Dict[str, Any]:
        """
        Parse plain text (no special formatting).

        For plain text, only 'content' field is available.
        This method exists for API consistency.

        Args:
            content: Plain text content

        Returns:
            Empty dict (fields added by parse() method)

        Example:
            >>> parser.parse_text("Hello world")
            {}
            # Full content available via parse() method which adds 'content' key
        """
        # No special parsing for plain text
        # The parse() method will include content in result
        return {}

    def extract_fields_from_prompt(self, prompt: str) -> Dict[str, str]:
        """
        Suggest field names based on prompt content.

        Analyzes prompt to suggest what fields the AI might generate.
        Useful for autocomplete UI hints.

        Args:
            prompt: AI prompt text

        Returns:
            Dict mapping suggested field names to descriptions

        Example:
            >>> parser.extract_fields_from_prompt(
            ...     "Generate title, description, and price for product"
            ... )
            {"title": "text", "description": "text", "price": "text"}
        """
        # Common field name patterns
        field_patterns = {
            r'\btitle\b': 'title',
            r'\bheadline\b': 'headline',
            r'\bdescription\b': 'description',
            r'\bbody\b': 'body',
            r'\bcontent\b': 'content',
            r'\bprice\b': 'price',
            r'\burl\b': 'url',
            r'\bimage[_\s]?(url|prompt)\b': 'image_url',
            r'\bcaption\b': 'caption',
            r'\btags?\b': 'tags',
            r'\bcategory\b': 'category',
            r'\bsummary\b': 'summary'
        }

        suggested_fields = {}

        for pattern, field_name in field_patterns.items():
            if re.search(pattern, prompt, re.IGNORECASE):
                suggested_fields[field_name] = 'text'

        return suggested_fields
