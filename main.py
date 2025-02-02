from openai import OpenAI

client = OpenAI(
	#omitted to prevent unauthorized users on github
	base_url="", 
	api_key="" 
)

chat_completion = client.chat.completions.create(
	model="tgi",
	messages=[
	{
		"role": "user",
		"content": "What is the number of birds in america that are migrating south daily?"
	}
],
	top_p=None,
	temperature=None,
	max_tokens=None,
	stream=True,
	seed=None,
	stop=None,
	frequency_penalty=None,
	presence_penalty=None
)

for message in chat_completion:
	print(message.choices[0].delta.content, end="")